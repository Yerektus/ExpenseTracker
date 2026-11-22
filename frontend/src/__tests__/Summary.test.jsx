import { render, screen } from "@testing-library/react";
import Summary from "../components/Summary.jsx";

test("показывает все категории из ответа сервера, включая неизвестные фронтенду", () => {
  render(<Summary summary={{ by_category: { travel: 5, food: 10 }, total: 15 }} />);

  const meters = screen.getAllByRole("meter");

  // Строки идут по убыванию суммы и в сумме дают итог.
  expect(meters).toHaveLength(2);
  expect(meters[0]).toHaveAccessibleName("Еда");
  expect(meters[0]).toHaveAttribute("aria-valuetext", "10,00");
  // Категория, которой нет в categories.js, показывается со своим ключом вместо подписи.
  expect(meters[1]).toHaveAccessibleName("travel");
  expect(meters[1]).toHaveAttribute("aria-valuetext", "5,00");
  expect(screen.getByTestId("summary-total")).toHaveTextContent("15,00");
});
