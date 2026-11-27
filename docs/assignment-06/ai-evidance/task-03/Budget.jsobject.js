// Appsmith JS Object "Budget" — paste into Queries/JS → + New JS Object → rename to Budget.
// Same rules as the code-based implementation (task-01/requirements.md §2).
// Widgets it reads: MonthInput (Input), CategorySelect (Select), LimitInput (Input, type Number).
// Query it runs: GetExpenses (REST, GET http://host.docker.internal:8000/api/expenses?category={{CategorySelect.selectedOptionValue}}).
export default {
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
      const expenses = await GetExpenses.run();
      await storeValue("budgetResult", this.calculate(expenses, month, Number(LimitInput.text)));
    } catch (error) {
      await storeValue("budgetError", "Не удалось подключиться к серверу. Запущен ли backend?");
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
