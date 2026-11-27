import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@heroui/react";
import BudgetCheck, { validateBudgetInput } from "../components/BudgetCheck.jsx";

const WARNING_RESULT = {
  month: "2025-03",
  category: "food",
  limit: 100,
  spent: 80,
  remaining: 20,
  percent_used: 80,
  status: "warning",
};

// Как в main.jsx: русская локаль, десятичный разделитель — запятая.
function renderBudgetCheck(props = {}) {
  const handlers = { onCheck: vi.fn(), onClear: vi.fn() };
  render(
    <I18nProvider locale="ru-RU">
      <BudgetCheck result={null} error="" isChecking={false} {...handlers} {...props} />
    </I18nProvider>,
  );
  return handlers;
}

async function fillForm(user, { month, limit }) {
  const monthInput = screen.getByRole("textbox", { name: "Месяц" });
  await user.clear(monthInput);
  if (month) {
    await user.type(monthInput, month);
  }
  const limitInput = screen.getByRole("textbox", { name: "Лимит на месяц" });
  await user.clear(limitInput);
  if (limit) {
    await user.type(limitInput, limit);
  }
  await user.click(screen.getByRole("button", { name: "Проверить" }));
}

test("валидный ввод: передаёт месяц, категорию и лимит в onCheck", async () => {
  const user = userEvent.setup();
  const { onCheck, onClear } = renderBudgetCheck();

  await fillForm(user, { month: "2025-03", limit: "79,99" });

  expect(onCheck).toHaveBeenCalledWith({ month: "2025-03", category: "food", limit: 79.99 });
  expect(onClear).not.toHaveBeenCalled();
});

test("показывает потрачено, остаток, процент и статус из результата", () => {
  renderBudgetCheck({ result: WARNING_RESULT });

  expect(screen.getByTestId("budget-spent")).toHaveTextContent("80,00");
  expect(screen.getByTestId("budget-remaining")).toHaveTextContent("20,00");
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "80,0 %");
  expect(screen.getByText("Близко к лимиту")).toBeInTheDocument();
});

test("превышение: отрицательный остаток и статус «Бюджет превышен»", () => {
  renderBudgetCheck({
    result: { ...WARNING_RESULT, limit: 79.99, remaining: -0.01, percent_used: 100, status: "over" },
  });

  expect(screen.getByText("Бюджет превышен")).toBeInTheDocument();
  expect(screen.getByTestId("budget-remaining")).toHaveTextContent(/[-−]0,01/);
});

test("неверный месяц и пустой лимит: сообщения у полей, проверка не запускается, старый результат убирается", async () => {
  const user = userEvent.setup();
  const { onCheck, onClear } = renderBudgetCheck();

  await fillForm(user, { month: "2025-13", limit: "" });

  expect(await screen.findByText("Укажите месяц в формате ГГГГ-ММ")).toBeInTheDocument();
  expect(screen.getByText("Лимит должен быть больше 0 и не больше 1 000 000")).toBeInTheDocument();
  expect(onCheck).not.toHaveBeenCalled();
  expect(onClear).toHaveBeenCalledTimes(1);
});

test("ошибка проверки: показывает сообщение и не показывает результат", () => {
  renderBudgetCheck({ error: "Не удалось подключиться к серверу. Запущен ли backend?" });

  expect(screen.getByText("Не удалось проверить бюджет")).toBeInTheDocument();
  expect(screen.getByText("Не удалось подключиться к серверу. Запущен ли backend?")).toBeInTheDocument();
  expect(screen.queryByTestId("budget-result")).not.toBeInTheDocument();
});

test("validateBudgetInput: границы месяца и лимита", () => {
  const valid = { month: "2025-03", category: "food", limit: 1_000_000 };

  expect(validateBudgetInput(valid)).toEqual({});
  expect(validateBudgetInput({ ...valid, limit: 0.01 })).toEqual({});
  expect(validateBudgetInput({ ...valid, limit: 0.005 })).toHaveProperty("limit");
  expect(validateBudgetInput({ ...valid, limit: 1_000_000.01 })).toHaveProperty("limit");
  expect(validateBudgetInput({ ...valid, limit: 0 })).toHaveProperty("limit");
  expect(validateBudgetInput({ ...valid, limit: -5 })).toHaveProperty("limit");
  expect(validateBudgetInput({ ...valid, limit: NaN })).toHaveProperty("limit");
  for (const month of ["2025-13", "2025-00", "03.2025", "0000-01", "", "2025-3"]) {
    expect(validateBudgetInput({ ...valid, month })).toHaveProperty("month");
  }
});
