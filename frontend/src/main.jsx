import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@heroui/react";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Русская локаль для полей даты и чисел (формат ДД.ММ.ГГГГ, десятичная запятая). */}
    <I18nProvider locale="ru-RU">
      <App />
    </I18nProvider>
  </StrictMode>,
);
