import { useState } from "react";
import {
  AlertDialog,
  Button,
  Chip,
  EmptyState,
  Skeleton,
  Table,
  Tooltip,
  useOverlayState,
} from "@heroui/react";
import { Pencil, Receipt, TrashBin } from "@gravity-ui/icons";
import { formatAmount, formatDate, getCategory } from "../categories.js";

function IconAction({ label, onPress, className, children }) {
  return (
    <Tooltip delay={300}>
      <Button isIconOnly size="sm" variant="ghost" aria-label={label} onPress={onPress} className={className}>
        {children}
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

function ConfirmDeleteDialog({ state, expense, onConfirm }) {
  return (
    <AlertDialog>
      <AlertDialog.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Удалить расход?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {expense && (
                <p>
                  «{expense.description || "Без описания"}» на сумму{" "}
                  <span className="font-medium tabular-nums">{formatAmount(expense.amount)}</span> от{" "}
                  {formatDate(expense.date)}. Это действие нельзя отменить.
                </p>
              )}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Отмена
              </Button>
              <Button slot="close" variant="danger" onPress={() => onConfirm(expense)}>
                Удалить
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

export function ExpenseListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <span className="sr-only">Загрузка…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function ExpenseList({ expenses, isFiltered, editingId, onEdit, onDelete }) {
  const deleteDialog = useOverlayState();
  // Не сбрасываем при закрытии, чтобы текст диалога не исчезал во время анимации.
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  function requestDelete(expense) {
    setExpenseToDelete(expense);
    deleteDialog.open();
  }

  return (
    <>
      <Table variant="secondary">
        <Table.ScrollContainer>
          <Table.Content aria-label="Список расходов">
            <Table.Header>
              <Table.Column isRowHeader>Дата</Table.Column>
              <Table.Column>Описание</Table.Column>
              <Table.Column>Категория</Table.Column>
              <Table.Column className="text-end">Сумма</Table.Column>
              <Table.Column className="w-24">
                <span className="sr-only">Действия</span>
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <EmptyState className="flex flex-col items-center gap-2 py-10">
                  <Receipt className="size-8" />
                  <span className="font-medium text-foreground">
                    {isFiltered ? "В этой категории расходов нет" : "Расходов пока нет"}
                  </span>
                  <span>
                    {isFiltered
                      ? "Выберите другую категорию в фильтре"
                      : "Добавьте первый расход с помощью формы"}
                  </span>
                </EmptyState>
              )}
            >
              {expenses.map((expense) => {
                const category = getCategory(expense.category);
                return (
                  <Table.Row
                    key={expense.id}
                    id={expense.id}
                    className={expense.id === editingId ? "bg-accent-soft" : undefined}
                  >
                    <Table.Cell className="whitespace-nowrap tabular-nums text-muted">
                      {formatDate(expense.date)}
                    </Table.Cell>
                    <Table.Cell>
                      {expense.description || <span className="text-muted">Без описания</span>}
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="soft" color={category.color} className="whitespace-nowrap">
                        {category.label}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-end font-medium tabular-nums">
                      {formatAmount(expense.amount)}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end gap-1">
                        <IconAction label="Редактировать" onPress={() => onEdit(expense)}>
                          <Pencil />
                        </IconAction>
                        <IconAction
                          label="Удалить"
                          className="text-danger"
                          onPress={() => requestDelete(expense)}
                        >
                          <TrashBin />
                        </IconAction>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <ConfirmDeleteDialog state={deleteDialog} expense={expenseToDelete} onConfirm={onDelete} />
    </>
  );
}
