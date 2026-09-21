import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["playwright/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**", "server/**"],
      exclude: [
        "**/*.test.*",
        "src/test-setup.ts",
        "src/vite-env.d.ts",
        "server/e2eMock.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 85,
        lines: 80,
      },
    },
  },
});