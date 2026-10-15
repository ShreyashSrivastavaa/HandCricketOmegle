import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "lib": path.resolve(__dirname, "./src/lib"),
      "game-core": path.resolve(__dirname, "./src/lib/game-core/index.ts"),
    },
  },
});
