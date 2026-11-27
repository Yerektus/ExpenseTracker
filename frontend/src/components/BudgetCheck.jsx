import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Chip,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Meter,
  NumberField,
  Select,
  TextField,
} from "@heroui/react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { CATEGORIES, formatAmount, formatPercent, getCategory } from "../categories.js";

const MONTH_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;
const MIN_LIMIT = 0.01;
const MAX_LIMIT = 1_000_000;

// Подпись и цвет статуса, который вернул сервер.
const BUDGET_STATUSES = {
  ok: { label: "В пределах бюджета", color: "success" },
  warning: { label: "Близко к лимиту", color: "warning" },
  over: { label: "Бюджет превышен", color: "danger" },
};

/** Проверка ввода для удобства пользователя; окончательно данные проверяет сервер. */
export function validateBudgetInput(values) {
  const errors = {};
  if (!MONTH_PATTERN.test(values.month)) {
    errors.month = "Укажите месяц в формате ГГГГ-ММ";
  }
  if (Number.isNaN(values.limit) || values.limit < MIN_LIMIT || values.limit > MAX_LIMIT) {
    errors.limit = "Лимит должен быть больше 0 и не больше 1 000 000";
  }
  return errors;
}

function getInitialValues() {
  // Текущий месяц: "2025-03-14" -> "2025-03". NaN — пустой NumberField.
  return { month: today(getLocalTimeZone()).toString().slice(0, 7), category: "food", limit: NaN };
}

/**
 * Проверка бюджета: сколько потрачено в категории за месяц относительно лимита.
 * Запрос и его результат живут в App.jsx (он же пересчитывает проверку после изменения расходов).
 * `onCheck({ month, category, limit })` — запустить проверку; `onClear()` — убрать прошлый результат.
 */
export default function BudgetCheck({ result, error, isChecking, onCheck, onClear }) {
  const [values, setValues] = useState(getInitialValues);
  const [errors, setErrors] = useState({});

  function setField(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateBudgetInput(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      // Старый результат не показываем: он относится к другим данным ввода.
      onClear();
      return;
    }
    onCheck(values);
  }

  const status = result ? BUDGET_STATUSES[result.status] : null;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Проверка бюджета</Card.Title>
        <Card.Description>Сколько потрачено в категории за месяц</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <Form validationBehavior="aria" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            name="month"
            variant="secondary"
            value={values.month}
            onChange={(month) => setField("month", month.trim())}
            isRequired
            isInvalid={Boolean(errors.month)}
            fullWidth
          >
            <Label>Месяц</Label>
            <Input placeholder="ГГГГ-ММ" />
            <FieldError>{errors.month}</FieldError>
          </TextField>

          <Select
            name="category"
            variant="secondary"
            value={values.category}
            onChange={(category) => setField("category", category)}
            fullWidth
          >
            <Label>Категория</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {CATEGORIES.map((category) => (
                  <ListBox.Item key={category.value} id={category.value} textValue={category.label}>
                    {category.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <NumberField
            name="limit"
            variant="secondary"
            value={values.limit}
            onChange={(limit) => setField("limit", limit)}
            formatOptions={{ maximumFractionDigits: 2 }}
            isRequired
            isInvalid={Boolean(errors.limit)}
            fullWidth
          >
            <Label>Лимит на месяц</Label>
            <NumberField.Group>
              <NumberField.Input placeholder="0,00" />
            </NumberField.Group>
            <FieldError>{errors.limit}</FieldError>
          </NumberField>

          <Button type="submit" variant="secondary" isPending={isChecking} fullWidth>
            Проверить
          </Button>
        </Form>

        {error && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось проверить бюджет</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {result && (
          <div className="flex flex-col gap-3" data-testid="budget-result">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted">
                {getCategory(result.category).label}, {result.month}
              </p>
              <Chip size="sm" color={status.color} variant="soft">
                {status.label}
              </Chip>
            </div>
            <Meter
              size="sm"
              color={status.color}
              value={Math.min(result.percent_used, 100)}
              valueLabel={formatPercent(result.percent_used)}
            >
              <Label>Использовано</Label>
              <Meter.Output className="tabular-nums" />
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">Потрачено</dt>
              <dd className="text-right tabular-nums" data-testid="budget-spent">
                {formatAmount(result.spent)}
              </dd>
              <dt className="text-muted">Осталось</dt>
              <dd className="text-right tabular-nums" data-testid="budget-remaining">
                {formatAmount(result.remaining)}
              </dd>
            </dl>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
