import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/*" alias straight from tsconfig.json, so tests and app code agree.
  resolve: { tsconfigPaths: true },
  test: {
    // The domain layer is pure TypeScript, so no DOM environment is needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
