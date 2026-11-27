// Appsmith JS Object "Budget" — CLOUD VARIANT (Appsmith Cloud, no backend).
// Same rules as the code-based implementation (task-01/requirements.md §2).
// DATA SOURCE IS A STATIC COPY: the 6 fictional fixture expenses (task-01 §4) are embedded below instead of
// GET /api/expenses, because Appsmith Cloud cannot reach the backend on localhost. Validation, core logic and
// output are identical to the local (Docker) variant in Budget.jsobject.js.
// Widgets it reads: MonthInput (Input), CategorySelect (Select), LimitInput (Input, type Number).
export default {
  // Static copy of the fixture (fictional data) — replaces the REST query GetExpenses.
  EXPENSES: [
    { date: "2025-02-28", category: "food", amount: 20.0, description: "Продукты (конец февраля)" },
    { date: "2025-03-01", category: "food", amount: 30.0, description: "Завтрак в кафе" },
    { date: "2025-03-15", category: "food", amount: 45.5, description: "Продукты на неделю" },
    { date: "2025-03-31", category: "food", amount: 4.5, description: "Кофе" },
    { date: "2025-04-01", category: "food", amount: 15.0, description: "Обед (начало апреля)" },
    { date: "2025-03-10", category: "transport", amount: 18.4, description: "Такси до вокзала" },
  ],
  MONTH_PATTERN: /^[1-9]\d{3}-(0[1-9]|1[0-2])$/,
  MIN_LIMIT: 0.01,
  MAX_LIMIT: 1000000,
  WARNING_PERCENT: 80,
  STATUSES: {
    ok: { label: "В пределах бюджета", color: "#16a34a" },
    warning: { label: "Близко к лимиту", color: "#d97706" },
    over: { label: "Бюджет превышен", color: "#dc2626" },
  },

  // Validation: returns { month?: message, limit?: message }.
  validate(month, limitText) {
    const errors = {};
    if (!this.MONTH_PATTERN.test(month)) {
      errors.month = "Укажите месяц в формате ГГГГ-ММ";
    }
    const limit = Number(limitText);
    // At least one cent and whole cents only (contract after the review fix, task-05 F1/F2).
    const wholeCents = Math.round(limit * 100) / 100 === limit;
    if (limitText === "" || limitText === undefined || Number.isNaN(limit) || limit < this.MIN_LIMIT || limit > this.MAX_LIMIT || !wholeCents) {
      errors.limit = "Лимит должен быть больше 0 и не больше 1 000 000";
    }
    return errors;
  },

  // Core logic: pure function over the expense list of one category.
  calculate(expenses, month, limit) {
    // "2025-03-31".slice(0, 7) === "2025-03": the 1st and the last day of the month are included.
    const inMonth = expenses.filter((expense) => expense.date.slice(0, 7) === month);
    const spent = Math.round(inMonth.reduce((sum, expense) => sum + expense.amount, 0) * 100) / 100;
    const spentCents = Math.round(spent * 100);
    const limitCents = Math.round(limit * 100);
    let status = "ok";
    if (spentCents > limitCents) {
      status = "over";
    } else if (spentCents * 100 >= limitCents * this.WARNING_PERCENT) {
      status = "warning";
    }
    return {
      month,
      limit,
      spent,
      remaining: Math.round((limit - spent) * 100) / 100,
      percent_used: Math.round((spent / limit) * 1000) / 10,
      status,
    };
  },

  // Button "Проверить" → onClick: {{Budget.check()}}
  async check() {
    // An old result is never shown for new input.
    await storeValue("budgetResult", null);
    await storeValue("budgetError", "");
    const month = (MonthInput.text || "").trim();
    const errors = this.validate(month, LimitInput.text);
    await storeValue("budgetErrors", errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    try {
      // Same filter as GET /api/expenses?category=…
      const expenses = this.EXPENSES.filter((expense) => expense.category === CategorySelect.selectedOptionValue);
      await storeValue("budgetResult", this.calculate(expenses, month, Number(LimitInput.text)));
    } catch (error) {
      await storeValue("budgetError", "Не удалось выполнить проверку: " + error.message);
    }
  },

  // User-facing output helpers.
  formatAmount(value) {
    return Number(value).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  formatPercent(value) {
    return Number(value).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
  },
};
