# Task 07 — Comparison: code-based (FastAPI + React) vs low-code (Appsmith)

Both implementations were built and tested on 2026-11-27 against the same backend, the same fixture data and the
same 11 cases. Both were produced with the AI agent; see the bias note at the end of §1.

## 1. Time (measured separately)

| Phase | Code-based | Appsmith | Sources |
|---|---|---|---|
| Setup | 1 min (16:38:25–16:39:24): branch, environment record, 5 baseline checks; venv, `node_modules` and Node (nvm) already existed | ≈ 3 min (~17:05–17:07:55): pull a ~2 GB image, start the container (55 s until healthy), create the local admin | `screenshots/timing-code.png`, `screenshots/timing-lowcode.png` |
| Implementation | 2 min 25 s (16:41:06–16:44:12 minus debugging): schemas, crud, router, api.js, component, App wiring, 27 tests | ≈ 2 min (17:07:55–17:09:55): export the blank app, write the JSON generator, import; the JS Object was reused from the prepared `Budget.jsobject.js` | same |
| Debugging | ≈ 40 s, 2 issues: missing mock export; locale in a test (`79,99` → `7999`) | ≈ 2 min, 1 issue: imported page DSL had version 4, so Appsmith's grid migration scaled every widget ×4 (L6) | same |
| Testing | 3 min 32 s (16:44:12–16:47:44): wrote the CDP test harness, 11 UI cases, API suite, screenshots | ≈ 2 min (17:11:53–17:13:47): 11 UI cases with an adapted harness, editor screenshots | same |
| Review fixes (code only) | 3 min (16:51:33–16:54:36): 2 fixes, new tests, mutation check, regression run | the same rule change (limit ≥ 0.01, whole cents) was copied into the JS Object | `task-05/` |

**Bias.** These are AI-agent times, and the Appsmith app was *generated as JSON and imported*, not assembled by
drag-and-drop (see `task-03/appsmith-build-guide.md`). So the measurement compares two AI-driven workflows, not a
human typing code against a human clicking in the editor. Appsmith also profited from work already done for the
code version (the contract, the JS logic ported from the Python function, the test harness). The times are
therefore close and should not be read as "Appsmith is as fast to build as code" or vice versa.

## 2. Comparison matrix with evidence

| Criterion | Code-based | Appsmith | Evidence |
|---|---|---|---|
| Common test suite (11 cases) | **11 / 11 Pass** (UI, re-run after fixes) | **11 / 11 Pass** (deployed app) | `task-04/test-suite.md`, `task-04/screenshots/ui-run-code-1.png`, `task-04/screenshots/ui-run-code-2.png`, `task-04/screenshots/ui-run-lowcode-1.png`, `task-04/screenshots/ui-run-lowcode-2.png` |
| Automated regression tests | 22 backend + 9 frontend tests for the feature, run in < 4 s; mutation check proves both fixes are guarded | none in this setup; regression = re-running the 11 UI cases (here by a browser script) | `task-08/screenshots/final-checks.png`, `task-05/screenshots/mutation-check.png`, L8 |
| Size of the solution | 380 added lines of app code (backend 114, frontend 266) + 318 lines of tests | 80-line JS Object + 15 configured widgets + 1 REST query; export JSON 126 KB | `git diff --numstat`, `task-03/` |
| Customization | Full: any HeroUI component, ru-RU number input with comma, design tokens, dark mode | Widget properties only; colours hard-coded in the JS Object; Number input uses a dot (L2); no month picker (L3); editor shows the fixed grid | `task-02/screenshots/`, `task-03/screenshots/` |
| Maintainability | Layers separated (schema → pure function → router → component), lint + format rules, reviewable diffs | Logic split between widget bindings, a JS Object and a query; changes are visible only in the editor or via a 126 KB export | AGENTS.md §2, L5 |
| Security controls | Server-side validation (Pydantic), read-only GET, CORS allow-list, ORM; SAST/DAST/SCA clean; 2 review defects fixed | Client-side validation only (bypassable; acceptable because the feature is read-only and the API validates itself); server-side calls are not limited by CORS; access depends on Appsmith sharing and its admin account | `task-06/security-assessment.md` |
| Portability / versioning | Plain files in git, every change is a commit; runs with Python 3.11+ and Node 22.12+ | App stored in Appsmith's database; versioning only via export or Git sync; tied to Appsmith v2.7.2 (an old DSL version already caused L6) | L5, L6 |
| Runtime cost / resources | 0; two small dev servers | 0 (Community Edition); Docker, ~2 GB image, container needed 55 s to start, VM with 4 GB RAM | L7 |
| Error handling | Field errors without a request; server error → Alert, inputs kept, old result removed (TC11) | Same messages via Text widgets, 0 query runs for invalid input; TC11 passes | `tc11.png` (both) |
| Data freshness | Recomputed after every add/edit/delete (fix 2) | Recomputed only when «Проверить» is pressed (the Appsmith app has no add/edit, so this is not visible there) | `task-05/screenshots/f3-*.png` |

## 3. Observations

- The low-code version still needed an 80-line hand-written JS Object: month filtering, the cents comparison and
  the formatting are not widget options. For this feature "low-code" means "the same logic, without tests".
- The validation gap found by the AI review (F1/F2) existed in the Appsmith logic too, because it was ported from
  the same rules. Only the code version has a test that would catch it coming back.
- Appsmith's strength showed in the UI layer: labels, a select, a progress bar and a deployed, login-protected app
  with no frontend build. Its weakness showed in versioning: a single version-number mismatch in the stored page
  layout broke the whole layout (L6).

## 4. Recommendation

For **this** feature I select the **code-based implementation**. Both versions pass 11 / 11, so correctness does
not decide it; the deciding evidence is (1) 31 automated tests and a mutation check versus none, (2) server-side
validation versus client-side only, (3) plain-file git history versus a 126 KB export tied to one Appsmith version,
and (4) it lives inside the existing app with no extra 2 GB runtime. Appsmith would be the better choice for a quick
internal dashboard over the existing API where no automated tests or code review are expected.
