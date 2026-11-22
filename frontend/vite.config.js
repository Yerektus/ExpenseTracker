import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Переменные VITE_* читаются из файла .env в корне репозитория.
  envDir: "..",
  server: {
    port: 5173,
    // Backend разрешает CORS только для порта 5173, поэтому другой порт не подбираем.
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
  },
});
