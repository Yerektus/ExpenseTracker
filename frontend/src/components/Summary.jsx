import { Card, Label, Meter, Separator, Skeleton } from "@heroui/react";
import { CATEGORIES, formatAmount } from "../categories.js";

export default function Summary({ summary }) {
  if (!summary) {
    return (
      <Card>
        <Card.Content className="flex flex-col gap-3">
          <Skeleton className="h-5 w-1/2 rounded-lg" />
          <Skeleton className="h-9 w-2/3 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </Card.Content>
      </Card>
    );
  }

  // Категории с наибольшими расходами — наверху.
  const rows = CATEGORIES.map((category) => ({
    ...category,
    amount: summary.by_category[category.value] ?? 0,
  })).sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <Card.Header>
        <Card.Title>Сводка</Card.Title>
        <Card.Description>По всем расходам, без учёта фильтра</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted">Всего потрачено</p>
          <p className="text-3xl font-semibold tabular-nums" data-testid="summary-total">
            {formatAmount(summary.total)}
          </p>
        </div>
        <Separator />
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <Meter
              key={row.value}
              size="sm"
              color={row.color}
              value={row.amount}
              minValue={0}
              maxValue={summary.total || 1}
              valueLabel={formatAmount(row.amount)}
            >
              <Label>{row.label}</Label>
              <Meter.Output className="tabular-nums" />
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
