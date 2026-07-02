import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    clearMocks: true,
    coverage: {
      exclude: [
        ".next/**",
        "src/app/**/*.tsx",
        "src/components/**",
        "src/generated/**",
        "src/types/**",
      ],
      include: [
        "src/actions/**/*.ts",
        "src/app/**/*.ts",
        "src/features/**/*.ts",
        "src/lib/**/*.ts",
      ],
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/coverage/**",
      "src/components/**",
      "src/generated/**",
      "src/**/*.tsx",
    ],
    globals: false,
    include: [
      "src/app/**/{actions,route}.test.ts",
      "src/app/**/*.server.test.ts",
      "src/actions/**/*.test.ts",
      "src/features/**/*.test.ts",
      "src/lib/**/*.test.ts",
    ],
    restoreMocks: true,
  },
});
