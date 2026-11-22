import { render, screen } from "@testing-library/react";
import App from "../App.jsx";
import { fetchExpenses, fetchSummary } from "../api.js";

vi.mock("../api.js", () => ({
  fetchExpenses: vi.fn(),
  fetchSummary: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

test("показывает сообщение об ошибке, если backend недоступен", async () => {
  fetchExpenses.mockRejectedValue(new Error("Не удалось подключиться к серверу"));
  fetchSummary.mockResolvedValue({ by_category: {}, total: 0 });

  render(<App />);

  expect(screen.getByText("Загрузка…")).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось подключиться к серверу");
});
