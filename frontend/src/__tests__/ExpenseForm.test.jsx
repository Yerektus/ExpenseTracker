import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExpenseForm from "../components/ExpenseForm.jsx";

const existingExpense = {
  id: 1,
  amount: 12.5,
  category: "transport",
  description: "Автобус",
  date: "2025-01-15",
};

test("в режиме редактирования отправляет изменённые данные", async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn().mockResolvedValue(undefined);
  render(<ExpenseForm expense={existingExpense} onSubmit={handleSubmit} onCancel={vi.fn()} />);

  const amountInput = screen.getByRole("textbox", { name: "Сумма" });
  await user.clear(amountInput);
  await user.type(amountInput, "20.75");

  const descriptionInput = screen.getByRole("textbox", { name: "Описание" });
  await user.clear(descriptionInput);
  await user.type(descriptionInput, "Такси");

  await user.click(screen.getByRole("button", { name: "Сохранить" }));

  await waitFor(() =>
    expect(handleSubmit).toHaveBeenCalledWith({
      amount: 20.75,
      category: "transport",
      description: "Такси",
      date: "2025-01-15",
    }),
  );
});
