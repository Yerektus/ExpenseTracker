# Response — Task 03: maintainability analysis and refactoring

Final responses of the agent to the user (verbatim, except that absolute paths containing the
username are replaced with `<repo>`). Screenshots of the results are in `screenshots/`.

---

## Part 1 — analysis

I found one real maintainability problem, and a small refactoring fixes it; a design pattern isn't justified. I didn't modify any files (`git status` shows only your untracked `docs/acceptance-criteria.md`).

### What I checked and didn't find

- **No duplicated conditionals.** There are no if/elif chains or `switch` statements over categories anywhere. The only `if`s in `backend/app` are input guards (`config.py:18`, `crud.py:12`, `routers/expenses.py:18`). The frontend already uses a lookup table (`getCategory()` in `categories.js`).
- **No business logic in the wrong layer.** Routers only handle HTTP. The summary is a pure function, `crud.calculate_summary()`. `App.jsx` coordinates state and doesn't calculate anything.
- **No misplaced DB or HTTP calls.** `fetch` appears only in `src/api.js`. In `backend/app`, database access happens only in `crud.py`.

So the codebase is mostly clean. The one real problem is below.

### The problem: the category list is defined twice, and the frontend summary trusts its own copy

The backend defines the categories in `backend/app/schemas.py:7-12`:
```python
class Category(StrEnum):
    FOOD = "food"
    TRANSPORT = "transport"
    ENTERTAINMENT = "entertainment"
    UTILITIES = "utilities"
    OTHER = "other"
```

The frontend keeps its own copy in `frontend/src/categories.js:2-8`:
```js
export const CATEGORIES = [
  { value: "food", label: "Еда", color: "success" },
  { value: "transport", label: "Транспорт", color: "accent" },
  ...
];
```

`frontend/src/components/Summary.jsx:18-21` decides which server totals to show using that frontend copy:
```js
const rows = CATEGORIES.map((category) => ({
  ...category,
  amount: summary.by_category[category.value] ?? 0,
})).sort((a, b) => b.amount - a.amount);
```

Nothing keeps the two lists in sync. `AGENTS.md` §8 only says they "must change together". Suppose someone adds a category on the backend but not in `categories.js`. The server's `total` will include the new category's amount, but the summary card won't show a row for it, so the rows no longer add up to the total. No error is raised, and no test catches it (there are no tests for `Summary.jsx`). I worked this out from the code; I didn't run it, because that would mean adding a test file.

Adding a category is the most likely future change in this project, and right now it means coordinated edits in `schemas.py`, `categories.js`, `seed.py` (category strings appear 10 times) and the tests. One of those consumers fails silently.

A related backend behaviour, which I confirmed by running it: `calculate_summary()` raises an error on a category value the enum doesn't know (`crud.py:50`), and `models.py:14` stores the category as plain `String(20)`.
```
ValueError: 'travel' is not a valid Category
```
That value can only reach the database by bypassing the API, so I note it but don't recommend changing it now.

### Is a pattern worth it?

| Option | What it would fix | What it costs | Verdict |
|---|---|---|---|
| **Strategy** | Nothing. Categories are data; no behaviour varies by category. | Extra classes and indirection for no benefit | No |
| **Adapter** (`GET /api/categories` endpoint plus a frontend adapter that merges server keys with labels and colors) | The backend becomes the only source of the category list | Changes the API contract (needs approval under `AGENTS.md` §8), adds a request and a loading state, and labels and colors still have to live on the client | Too expensive for 5 fixed values |
| **Shared JSON file or generated code** for Python and JS | One file instead of two | New build tooling across two languages, which is out of scope | No |
| **Small refactoring**: the summary shows whatever categories the server returns, using the existing `getCategory()` for display | The silent drop goes away; displayed rows always add up to the total | About 4 lines in one file; no new files, dependencies or API changes | **Recommended** |

The simple tool is already in place: `getCategory()` in `categories.js` is a lookup table with a fallback for unknown values. `Summary.jsx` just doesn't use it.

### Recommendation: small refactoring, no pattern

**Before:** the frontend `CATEGORIES` list decides which server totals appear in the summary.
**After:** the server's `by_category` decides which rows appear, and `categories.js` only supplies the label and color for each one.

```js
// Summary.jsx — after
const rows = Object.entries(summary.by_category)
  .map(([value, amount]) => ({ ...getCategory(value), amount }))
  .sort((a, b) => b.amount - a.amount);
```

`ExpenseForm` and the filter still list categories from `CATEGORIES`, which is fine: they only offer values the backend accepts. If the backend gains a category, the summary and the table show it with a fallback label until someone adds it to `categories.js`.

**Tests that already cover this area:**
- `backend/tests/test_expenses.py::test_summary_endpoint` checks the `by_category` keys and the total.
- `backend/tests/test_expenses.py::test_calculate_summary_rounds_totals` checks the calculation itself.
- There are no frontend tests for `Summary.jsx`.

**New test to add:** `frontend/src/__tests__/Summary.test.jsx`.
- Render `<Summary>` with `{ by_category: { food: 10, travel: 5 }, total: 15 }`.
- Check that a row for the unknown `travel` category is shown with its amount.
- Check that the known category shows its Russian label «Еда».
- Check that rows are sorted by amount (food before travel).

**Lower priority, not recommended now:** the category `<Select>` markup is nearly identical in `App.jsx:143-165` and `ExpenseForm.jsx:118-140`. Pulling it into a `CategorySelect` component would remove about 15 lines, but it doesn't cause bugs.

---

## Part 2 — implementation

I made the one change: the summary card in `frontend/src/components/Summary.jsx` now shows the categories the server returns, instead of the frontend's own list. I added one test for it. All checks pass: backend 8, frontend 3, build OK. It's on a new branch, `refactor/summary-categories-from-server`, and not committed.

### Summary

- **The change:** `Summary.jsx` now builds its rows from `summary.by_category` and uses the existing `getCategory()` only for each row's label and color. No new files besides the test, no new dependencies, no API changes.
- **The test:** `frontend/src/__tests__/Summary.test.jsx` renders the summary with a category the frontend doesn't know (`travel`). It checks that the category appears with its amount, that rows are sorted by amount, and the total.
  - On the old code the test failed: `expected [ …(5) ] to have a length of 2 but got 5`. The old code rendered the frontend's 5 categories and dropped `travel`.
  - On the new code it passes.
- **Behavior for what the backend sends today is unchanged.** The backend always returns all 5 categories, in the same order as `categories.js` (checked: `['food', 'transport', 'entertainment', 'utilities', 'other']`). So the rows, labels, colors, and the order of equal amounts are the same as before.
  - It only differs when the server sends a category the frontend doesn't know (now shown, with its key as the label) or leaves one out (no longer shown as a 0 row). Neither can happen with the current backend.

### Full git diff

```
 M frontend/src/components/Summary.jsx
?? docs/acceptance-criteria.md                 (your file, untouched)
?? frontend/src/__tests__/Summary.test.jsx     (new)
 frontend/src/components/Summary.jsx | 10 +++++-----
 1 file changed, 5 insertions(+), 5 deletions(-)
```

```diff
diff --git a/frontend/src/components/Summary.jsx b/frontend/src/components/Summary.jsx
index 08d63ac..709e7ab 100644
--- a/frontend/src/components/Summary.jsx
+++ b/frontend/src/components/Summary.jsx
@@ -1,5 +1,5 @@
 import { Card, Label, Meter, Separator, Skeleton } from "@heroui/react";
-import { CATEGORIES, formatAmount } from "../categories.js";
+import { formatAmount, getCategory } from "../categories.js";
 
 export default function Summary({ summary }) {
   if (!summary) {
@@ -14,11 +14,11 @@ export default function Summary({ summary }) {
     );
   }
 
+  // Какие категории показывать, решает сервер; categories.js даёт только подпись и цвет.
   // Категории с наибольшими расходами — наверху.
-  const rows = CATEGORIES.map((category) => ({
-    ...category,
-    amount: summary.by_category[category.value] ?? 0,
-  })).sort((a, b) => b.amount - a.amount);
+  const rows = Object.entries(summary.by_category)
+    .map(([value, amount]) => ({ ...getCategory(value), amount }))
+    .sort((a, b) => b.amount - a.amount);
 
   return (
     <Card>
diff --git a/frontend/src/__tests__/Summary.test.jsx b/frontend/src/__tests__/Summary.test.jsx
new file mode 100644
index 0000000..e3e8edc
--- /dev/null
+++ b/frontend/src/__tests__/Summary.test.jsx
@@ -0,0 +1,17 @@
+import { render, screen } from "@testing-library/react";
+import Summary from "../components/Summary.jsx";
+
+test("показывает все категории из ответа сервера, включая неизвестные фронтенду", () => {
+  render(<Summary summary={{ by_category: { travel: 5, food: 10 }, total: 15 }} />);
+
+  const meters = screen.getAllByRole("meter");
+
+  // Строки идут по убыванию суммы и в сумме дают итог.
+  expect(meters).toHaveLength(2);
+  expect(meters[0]).toHaveAccessibleName("Еда");
+  expect(meters[0]).toHaveAttribute("aria-valuetext", "10,00");
+  // Категория, которой нет в categories.js, показывается со своим ключом вместо подписи.
+  expect(meters[1]).toHaveAccessibleName("travel");
+  expect(meters[1]).toHaveAttribute("aria-valuetext", "5,00");
+  expect(screen.getByTestId("summary-total")).toHaveTextContent("15,00");
+});
```

### Command output

```
$ cd backend && pytest -q
........                                                                 [100%]
StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
8 passed, 1 warning in 0.08s
exit=0

$ cd frontend && npm test && npm run build
> vitest run
 RUN  v5.1.1 <repo>/frontend
 Test Files  3 passed (3)
      Tests  3 passed (3)

> vite build
vite v8.3.8 building client environment for production...
✓ 2580 modules transformed.
dist/index.html                   1.47 kB │ gzip:   0.87 kB
dist/assets/index-Du17J_JN.css  470.84 kB │ gzip:  43.47 kB
dist/assets/index-CBLzvOQA.js   775.09 kB │ gzip: 237.83 kB
(!) Some chunks are larger than 500 kB after minification. ...
✓ built in 343ms
exit=0
```

The only warnings are the two already recorded in `AGENTS.md` §4.

### Before / after

| | Before | After |
|---|---|---|
| What decides which rows the summary shows | The frontend's `CATEGORIES` list | The server's `summary.by_category` |
| Role of `categories.js` in the summary | List of categories plus labels and colors | Labels and colors only, through `getCategory()` |
| Category the server has but the frontend doesn't | Silently dropped; rows don't add up to the total | Shown, with its key as the label |
| What has to change when a category is added | `schemas.py` + `categories.js`, or the summary is wrong | `schemas.py` alone keeps the summary correct; `categories.js` only adds a nicer label |
| Frontend tests | 2 (no tests for `Summary`) | 3 (`Summary.test.jsx`) |

```
Before:  server by_category ──┐
         CATEGORIES (frontend) ┴─> Summary rows   (frontend list decides)

After:   server by_category ──> Summary rows
         getCategory(value) ──> label + color for each row
```

### Risks and what I didn't check

- **Risk:** if the backend ever stops sending zero-amount categories, those rows would disappear instead of showing 0. Today `calculate_summary()` always includes all 5, which `test_summary_endpoint` checks.
- **Not checked by hand:** I didn't open the UI in a browser for this change. The test renders the component, and the build passes.
- **Node.js** isn't installed system-wide; the frontend checks ran with the standalone Node v26.13.1 from the session's temporary folder.

Next step is your review. If you approve, I can commit to this branch and add this task to `docs/ai-evidance/` like Task 02.
