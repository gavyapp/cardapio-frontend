import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Testes de unidade de funções puras em src/lib. Os testes do banco são
// pgTAP (supabase/tests/database).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
