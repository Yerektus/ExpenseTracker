const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function getErrorMessage(response) {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail)) {
      // Ошибки валидации FastAPI (422) приходят списком.
      return body.detail.map((error) => error.msg).join("; ");
    }
  } catch {
    // Тело ответа не JSON — используем сообщение по умолчанию.
  }
  return `Ошибка запроса (код ${response.status})`;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Не удалось подключиться к серверу. Запущен ли backend?");
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export function fetchExpenses(category = "") {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return request(`/expenses${query}`);
}

export function createExpense(expense) {
  return request("/expenses", { method: "POST", body: JSON.stringify(expense) });
}

export function updateExpense(id, expense) {
  return request(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(expense) });
}

export function deleteExpense(id) {
  return request(`/expenses/${id}`, { method: "DELETE" });
}

export function fetchSummary() {
  return request("/summary");
}
