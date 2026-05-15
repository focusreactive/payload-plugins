import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import sharedConfig from "@repo/eslint-config";
import { globalIgnores } from "eslint/config";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...sharedConfig,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: false,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^(_|ignore)",
        },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.name='useMemo']",
          message: "useMemo not needed with React Compiler",
        },
        {
          selector: "CallExpression[callee.name='useCallback']",
          message: "useCallback not needed with React Compiler",
        },
      ],
    },
  },
  {
    ignores: [".next/"],
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    "src/migrations/**",
    ".claude/**",
  ]),
];

export default eslintConfig;
