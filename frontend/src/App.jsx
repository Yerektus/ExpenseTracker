import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Chip,
  ListBox,
  Select,
  Toast,
  Typography,
  toast,
} from "@heroui/react";
import { ArrowRotateLeft, Wallet } from "@gravity-ui/icons";
import {
  createExpense,
  deleteExpense,
  fetchBudgetCheck,
  fetchExpenses,
  fetchSummary,
  updateExpense,
} from "./api.js";
import { CATEGORIES } from "./categories.js";
import BudgetCheck from "./components/BudgetCheck.jsx";
import ExpenseForm from "./components/ExpenseForm.jsx";
import ExpenseList, { ExpenseListSkeleton } from "./components/ExpenseList.jsx";
import Summary from "./components/Summary.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";

const ALL_CATEGORIES = "all";

export default function App() {
  // null — данные ещё ни разу не загружались (показываем скелетон).
  const [expenses, setExpenses] = useState(null);
  const [summary, setSummary] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // Увеличивается, когда данные нужно загрузить заново (после сохранения, удаления, «Повторить»).
  const [reloadCount, setReloadCount] = useState(0);
  // Проверка бюджета: параметры последней проверки (null — проверки ещё не было) и её результат.
  const [budgetQuery, setBudgetQuery] = useState(null);
  const [budgetResult, setBudgetResult] = useState(null);
  const [budgetError, setBudgetError] = useState("");
  const [isBudgetChecking, setIsBudgetChecking] = useState(false);

  // Загрузка списка и сводки. Состояние меняется только в колбэках промиса,
  // а ответ устаревшего запроса (фильтр уже сменился) игнорируется.
  // isLoading и error перед загрузкой выставляют обработчики (или начальное состояние).
  useEffect(() => {
    let ignore = false;
    const category = categoryFilter === ALL_CATEGORIES ? "" : categoryFilter;
    Promise.all([fetchExpenses(category), fetchSummary()])
      .then(([expenseList, summaryData]) => {
        if (!ignore) {
          setExpenses(expenseList);
          setSummary(summaryData);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [categoryFilter, reloadCount]);

  // Проверка бюджета повторяется после каждого изменения расходов (reloadCount),
  // поэтому карточка не показывает устаревшие цифры. Ответ устаревшего запроса игнорируется.
  useEffect(() => {
    if (budgetQuery === null) {
      return undefined;
    }
    let ignore = false;
    fetchBudgetCheck(budgetQuery)
      .then((result) => {
        if (!ignore) {
          setBudgetResult(result);
          setBudgetError("");
        }
      })
      .catch((checkError) => {
        if (!ignore) {
          setBudgetResult(null);
          setBudgetError(checkError.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsBudgetChecking(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [budgetQuery, reloadCount]);

  function handleBudgetCheck(query) {
    setBudgetResult(null);
    setBudgetError("");
    setIsBudgetChecking(true);
    // Новый объект — чтобы повторная проверка с теми же значениями тоже ушла на сервер.
    setBudgetQuery({ ...query });
  }

  function handleBudgetClear() {
    setBudgetQuery(null);
    setBudgetResult(null);
    setBudgetError("");
    setIsBudgetChecking(false);
  }

  function reloadData() {
    setIsLoading(true);
    setError("");
    setReloadCount((count) => count + 1);
  }

  function handleFilterChange(value) {
    if (value === categoryFilter) {
      return;
    }
    setIsLoading(true);
    setError("");
    setCategoryFilter(value);
  }

  // Ошибка сохранения пробрасывается дальше — её показывает сама форма.
  async function handleSave(expenseData) {
    if (editingExpense) {
      await updateExpense(editingExpense.id, expenseData);
      setEditingExpense(null);
      toast.success("Изменения сохранены");
    } else {
      await createExpense(expenseData);
      toast.success("Расход добавлен");
    }
    reloadData();
  }

  async function handleDelete(expense) {
    try {
      await deleteExpense(expense.id);
      if (editingExpense?.id === expense.id) {
        setEditingExpense(null);
      }
      toast.success("Расход удалён");
      reloadData();
    } catch (deleteError) {
      toast.danger("Не удалось удалить расход", { description: deleteError.message });
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-separator bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Wallet />
            </div>
            <div>
              <Typography.Heading level={1} className="text-lg leading-tight">
                Expense Tracker
              </Typography.Heading>
              <Typography.Paragraph size="xs" color="muted">
                Учёт личных расходов
              </Typography.Paragraph>
            </div>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {error && (
          <Alert status="danger" role="alert">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить данные</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
            <Button size="sm" variant="danger-soft" onPress={reloadData} isPending={isLoading}>
              <ArrowRotateLeft />
              Повторить
            </Button>
          </Alert>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
            <ExpenseForm
              key={editingExpense ? editingExpense.id : "new"}
              expense={editingExpense}
              onSubmit={handleSave}
              onCancel={() => setEditingExpense(null)}
            />
            <Summary summary={summary} />
            <BudgetCheck
              result={budgetResult}
              error={budgetError}
              isChecking={isBudgetChecking}
              onCheck={handleBudgetCheck}
              onClear={handleBudgetClear}
            />
          </aside>

          <Card>
            <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Card.Title>Расходы</Card.Title>
                {expenses && (
                  <Chip size="sm" variant="secondary">
                    {expenses.length}
                  </Chip>
                )}
              </div>
              <Select
                aria-label="Фильтр по категории"
                className="w-full sm:w-56"
                variant="secondary"
                value={categoryFilter}
                onChange={handleFilterChange}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id={ALL_CATEGORIES} textValue="Все категории">
                      Все категории
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {CATEGORIES.map((category) => (
                      <ListBox.Item key={category.value} id={category.value} textValue={category.label}>
                        {category.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </Card.Header>
            <Card.Content>
              {expenses === null ? (
                <ExpenseListSkeleton />
              ) : (
                <ExpenseList
                  expenses={expenses}
                  isFiltered={categoryFilter !== ALL_CATEGORIES}
                  editingId={editingExpense?.id}
                  onEdit={setEditingExpense}
                  onDelete={handleDelete}
                />
              )}
            </Card.Content>
          </Card>
        </div>
      </main>

      <Toast.Provider placement="bottom end" />
    </div>
  );
}
