import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "@heroui/react";
import { beforeEach } from "vitest";
import App from "../App.jsx";
import { createExpense, deleteExpense, fetchExpenses, fetchSummary } from "../api.js";

vi.mock("../api.js", () => ({
  fetchExpenses: vi.fn(),
  fetchSummary: vi.fn(),
  fetchBudgetCheck: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

const LUNCH = { id: 1, amount: 12.5, category: "food", description: "Обед в столовой", date: "2025-03-01" };
const TAXI = { id: 2, amount: 18.4, category: "transport", description: "Такси до вокзала", date: "2025-03-08" };

// Мок api.js ведёт себя как маленький сервер: fetchExpenses возвращает текущий список.
let serverExpenses;

beforeEach(() => {
  // Очередь уведомлений HeroUI глобальная: убираем тосты, оставшиеся от прошлого теста.
  toast.clear();
  vi.resetAllMocks();
  serverExpenses = [TAXI, LUNCH];
  fetchExpenses.mockImplementation(async (category) =>
    category ? serverExpenses.filter((expense) => expense.category === category) : serverExpenses,
  );
  fetchSummary.mockResolvedValue({ by_category: {}, total: 0 });
});

async function confirmDelete(user, description) {
  const row = (await screen.findByRole("gridcell", { name: description })).closest('[role="row"]');
  await user.click(within(row).getByRole("button", { name: "Удалить" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Удалить расход?" });
  await user.click(within(dialog).getByRole("button", { name: "Удалить" }));
}

test("удаление: вызывает API и убирает расход из списка", async () => {
  deleteExpense.mockImplementation(async (id) => {
    serverExpenses = serverExpenses.filter((expense) => expense.id !== id);
    return null;
  });
  const user = userEvent.setup();
  render(<App />);

  await confirmDelete(user, "Обед в столовой");

  await waitFor(() =>
    expect(screen.queryByRole("gridcell", { name: "Обед в столовой" })).not.toBeInTheDocument(),
  );
  expect(deleteExpense).toHaveBeenCalledTimes(1);
  expect(deleteExpense).toHaveBeenCalledWith(1);
  expect(screen.getByRole("gridcell", { name: "Такси до вокзала" })).toBeInTheDocument();
  expect(await screen.findByText("Расход удалён")).toBeInTheDocument();
});

test("ошибка удаления: показывает сообщение и оставляет расход в списке", async () => {
  deleteExpense.mockRejectedValue(new Error("Expense 1 not found"));
  const user = userEvent.setup();
  render(<App />);

  await confirmDelete(user, "Обед в столовой");

  expect(await screen.findByText("Не удалось удалить расход")).toBeInTheDocument();
  expect(screen.getByText("Expense 1 not found")).toBeInTheDocument();
  expect(deleteExpense).toHaveBeenCalledWith(1);
  expect(screen.getByRole("gridcell", { name: "Обед в столовой" })).toBeInTheDocument();
});

test("ошибка сохранения: форма показывает сообщение сервера и сохраняет введённые данные", async () => {
  createExpense.mockRejectedValue(new Error("Input should be greater than 0"));
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("gridcell", { name: "Обед в столовой" });

  const amountInput = screen.getByRole("textbox", { name: "Сумма" });
  await user.type(amountInput, "7");
  await user.click(screen.getByRole("button", { name: "Добавить расход" }));

  expect(await screen.findByText("Не удалось сохранить")).toBeInTheDocument();
  expect(screen.getByText("Input should be greater than 0")).toBeInTheDocument();
  expect(createExpense).toHaveBeenCalledTimes(1);
  expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 7, category: "food" }));
  expect(amountInput).toHaveValue("7");
});

test("фильтр: запрашивает выбранную категорию и показывает только её расходы", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("gridcell", { name: "Обед в столовой" });

  await user.click(screen.getByRole("button", { name: /Фильтр по категории/ }));
  await user.click(await screen.findByRole("option", { name: "Транспорт" }));

  await waitFor(() =>
    expect(screen.queryByRole("gridcell", { name: "Обед в столовой" })).not.toBeInTheDocument(),
  );
  expect(fetchExpenses).toHaveBeenLastCalledWith("transport");
  expect(screen.getByRole("gridcell", { name: "Такси до вокзала" })).toBeInTheDocument();
});

test("«Повторить» после ошибки загрузки загружает данные снова", async () => {
  fetchExpenses.mockRejectedValueOnce(new Error("Не удалось подключиться к серверу"));
  const user = userEvent.setup();
  render(<App />);

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Не удалось подключиться к серверу");
  await user.click(within(alert).getByRole("button", { name: "Повторить" }));

  expect(await screen.findByRole("gridcell", { name: "Обед в столовой" })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(fetchExpenses).toHaveBeenCalledTimes(2);
});
