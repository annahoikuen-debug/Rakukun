import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/*.d.ts",
      "e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 50,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});