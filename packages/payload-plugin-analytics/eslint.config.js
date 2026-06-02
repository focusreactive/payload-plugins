import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default defineConfig(
  {
    ignores: ["dist/", "node_modules/"],
  },
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/services/ga4DataClient/**", "src/services/analyticsService/**", "src/**/*.test.ts", "src/**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@google-analytics/data",
              message: "Import the GA4 SDK only inside src/services/ga4DataClient or src/services/analyticsService. Call runQuery instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/services/ga4DataClient", "**/services/ga4DataClient/index"],
              importNames: ["__setGa4ClientForTests", "__resetGa4Client"],
              message: "Test seam — only *.test.ts files may import it.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/services/**/*.ts", "src/endpoints/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "services/ and endpoints/ are server-only." },
            { name: "react-dom", message: "services/ and endpoints/ are server-only." },
          ],
          patterns: [{ group: ["next/*"], message: "services/ and endpoints/ are server-only — no next/* imports." }],
        },
      ],
    },
  }
);
