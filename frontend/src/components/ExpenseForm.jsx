import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  DateField,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  TextField,
} from "@heroui/react";
import { Plus } from "@gravity-ui/icons";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { CATEGORIES, formatDate } from "../categories.js";

function getInitialValues(expense) {
  if (expense) {
    return {
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: parseDate(expense.date),
    };
  }
  // NaN — так NumberField обозначает пустое поле.
  return { amount: NaN, category: "food", description: "", date: today(getLocalTimeZone()) };
}

function validate(values) {
  const errors = {};
  if (Number.isNaN(values.amount) || values.amount <= 0) {
    errors.amount = "Сумма должна быть больше нуля";
  }
  if (!values.date) {
    errors.date = "Укажите дату";
  }
  return errors;
}

/**
 * Форма создания или редактирования расхода.
 * Если передан `expense`, форма работает в режиме редактирования.
 */
export default function ExpenseForm({ expense = null, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => getInitialValues(expense));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = expense !== null;

  function setField(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: values.amount,
        category: values.category,
        description: values.description.trim(),
        date: values.date.toString(), // ГГГГ-ММ-ДД
      });
      if (!isEditing) {
        setValues(getInitialValues(null));
      }
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className={isEditing ? "ring-2 ring-accent" : undefined}>
      <Card.Header>
        <Card.Title>{isEditing ? "Редактирование" : "Новый расход"}</Card.Title>
        <Card.Description>
          {isEditing
            ? `Запись от ${formatDate(expense.date)}`
            : "Укажите сумму, категорию и дату"}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Form validationBehavior="aria" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <NumberField
            name="amount"
            variant="secondary"
            value={values.amount}
            onChange={(amount) => setField("amount", amount)}
            minValue={0}
            formatOptions={{ maximumFractionDigits: 2 }}
            isRequired
            isInvalid={Boolean(errors.amount)}
            fullWidth
          >
            <Label>Сумма</Label>
            <NumberField.Group>
              <NumberField.Input placeholder="0,00" />
            </NumberField.Group>
            <FieldError>{errors.amount}</FieldError>
          </NumberField>

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

          <TextField
            name="description"
            variant="secondary"
            value={values.description}
            onChange={(description) => setField("description", description)}
            maxLength={255}
            fullWidth
          >
            <Label>Описание</Label>
            <Input placeholder="Например, обед в кафе" />
          </TextField>

          <DateField
            name="date"
            value={values.date}
            onChange={(date) => setField("date", date)}
            isRequired
            isInvalid={Boolean(errors.date)}
            fullWidth
          >
            <Label>Дата</Label>
            <DateField.Group variant="secondary">
              <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
            </DateField.Group>
            <FieldError>{errors.date}</FieldError>
          </DateField>

          {submitError && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Не удалось сохранить</Alert.Title>
                <Alert.Description>{submitError}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" isPending={isSubmitting} fullWidth={!isEditing}>
              {!isEditing && <Plus />}
              {isEditing ? "Сохранить" : "Добавить расход"}
            </Button>
            {isEditing && (
              <Button variant="tertiary" onPress={onCancel}>
                Отмена
              </Button>
            )}
          </div>
        </Form>
      </Card.Content>
    </Card>
  );
}
