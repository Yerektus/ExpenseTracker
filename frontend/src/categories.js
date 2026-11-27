// color — один из семантических цветов HeroUI (используется в Chip и Meter).
export const CATEGORIES = [
  { value: "food", label: "Еда", color: "success" },
  { value: "transport", label: "Транспорт", color: "accent" },
  { value: "entertainment", label: "Развлечения", color: "warning" },
  { value: "utilities", label: "Коммунальные услуги", color: "default" },
  { value: "other", label: "Другое", color: "default" },
];

export function getCategory(value) {
  return CATEGORIES.find((item) => item.value === value) ?? { value, label: value, color: "default" };
}

const amountFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 -> "1 234,50" */
export function formatAmount(amount) {
  return amountFormatter.format(Number(amount));
}

/** "2025-03-01" -> "01.03.2025" */
export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

const percentFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 80 -> "80,0 %" */
export function formatPercent(percent) {
  return `${percentFormatter.format(Number(percent))} %`;
}
