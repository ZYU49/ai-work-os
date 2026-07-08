import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
  test: {
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**", ".worktrees/**"],
  },
});
