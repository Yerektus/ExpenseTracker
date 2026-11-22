import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";

// Минимальная конфигурация ESLint для React (JSX, без TypeScript). Запуск: npm run lint
export default [
  { ignores: ["dist/"] },
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      // Браузерные глобальные переменные, которые использует код.
      globals: { window: "readonly", document: "readonly", fetch: "readonly" },
    },
  },
  {
    // Vitest запускается с globals: true (vite.config.js).
    files: ["src/__tests__/**", "src/setupTests.js"],
    languageOptions: {
      globals: { test: "readonly", expect: "readonly", vi: "readonly" },
    },
  },
];
