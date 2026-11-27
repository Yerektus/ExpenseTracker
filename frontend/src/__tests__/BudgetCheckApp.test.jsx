import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "@heroui/react";
import { beforeEach } from "vitest";
import App from "../App.jsx";
import { createExpense, fetchBudgetCheck, fetchExpenses, fetchSummary } from "../api.js";

vi.mock("../api.js", () => ({
  fetchExpenses: vi.fn(),
  fetchSummary: vi.fn(),
  fetchBudgetCheck: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

function budgetResult(month, spent, limit = 100) {
  return {
    month,
    category: "food",
    limit,
    spent,
    remaining: limit - spent,
    percent_used: (spent / limit) * 100,
    status: spent > limit ? "over" : spent >= 0.8 * limit ? "warning" : "ok",
  };
}

function budgetCard() {
  return screen.getByText("Проверка бюджета").closest(".card");
}

async function runCheck(user, month, limit) {
  const card = within(budgetCard());
  const monthInput = card.getByRole("textbox", { name: "Месяц" });
  await user.clear(monthInput);
  await user.type(monthInput, month);
  const limitInput = card.getByRole("textbox", { name: "Лимит на месяц" });
  await user.clear(limitInput);
  await user.type(limitInput, limit);
  await user.click(card.getByRole("button", { name: "Проверить" }));
}

beforeEach(() => {
  toast.clear();
  vi.resetAllMocks();
  fetchExpenses.mockResolvedValue([]);
  fetchSummary.mockResolvedValue({ by_category: {}, total: 0 });
});

test("после добавления расхода проверка бюджета пересчитывается, а не показывает старые цифры", async () => {
  let marchFoodSpent = 80;
  fetchBudgetCheck.mockImplementation(async ({ month }) => budgetResult(month, marchFoodSpent));
  createExpense.mockImplementation(async (expense) => {
    marchFoodSpent += expense.amount;
    return { id: 99, ...expense };
  });
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Проверка бюджета");

  await runCheck(user, "2025-03", "100");
  expect(await screen.findByTestId("budget-spent")).toHaveTextContent("80,00");

  await user.type(screen.getByRole("textbox", { name: "Сумма" }), "30");
  await user.click(screen.getByRole("button", { name: "Добавить расход" }));

  await waitFor(() => expect(screen.getByTestId("budget-spent")).toHaveTextContent("110,00"));
  expect(within(budgetCard()).getByText("Бюджет превышен")).toBeInTheDocument();
});

test("ошибка сервера: сообщение в карточке, ввод сохранён, прошлый результат убран", async () => {
  fetchBudgetCheck
    .mockResolvedValueOnce(budgetResult("2025-03", 80))
    .mockRejectedValueOnce(new Error("Не удалось подключиться к серверу. Запущен ли backend?"));
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Проверка бюджета");

  await runCheck(user, "2025-03", "200");
  await screen.findByTestId("budget-result");
  await user.click(within(budgetCard()).getByRole("button", { name: "Проверить" }));

  expect(await within(budgetCard()).findByText("Не удалось проверить бюджет")).toBeInTheDocument();
  expect(screen.queryByTestId("budget-result")).not.toBeInTheDocument();
  expect(within(budgetCard()).getByRole("textbox", { name: "Месяц" })).toHaveValue("2025-03");
  expect(within(budgetCard()).getByRole("textbox", { name: "Лимит на месяц" })).toHaveValue("200");
});

test("повторная проверка с теми же значениями снова обращается к серверу", async () => {
  fetchBudgetCheck.mockImplementation(async ({ month }) => budgetResult(month, 80));
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Проверка бюджета");

  await runCheck(user, "2025-03", "100");
  await screen.findByTestId("budget-result");
  await user.click(within(budgetCard()).getByRole("button", { name: "Проверить" }));
  await user.click(within(budgetCard()).getByRole("button", { name: "Проверить" }));

  await waitFor(() => expect(fetchBudgetCheck).toHaveBeenCalledTimes(3));
  expect(fetchBudgetCheck).toHaveBeenLastCalledWith({ month: "2025-03", category: "food", limit: 100 });
  expect(await screen.findByTestId("budget-spent")).toHaveTextContent("80,00");
});
