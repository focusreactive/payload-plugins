import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";

// Curated overrides on top of ultracite's React/Next ruleset.
// Rationale lives next to each rule — based on per-plugin audits that showed
// the disabled set produces ~70% of the noise on this legacy code, and the
// warn set is context-dependent (idiomatic patterns the rule doesn't fit).
export default defineConfig({
  extends: [core, next],
  ignorePatterns: [
    "**/.next/**",
    "**/dist/**",
    "**/node_modules/**",
    "**/.turbo/**",
    "**/coverage/**",
    "packages/database/migrations/**",
    "apps/cms/src/payload-types.ts",
    "apps/cms/src/app/(payload)/admin/importMap.js",
    "apps/dev/src/payload-types.ts",
  ],
  rules: {
    // Top-noise disables ────────────────────────────────────────────────
    // Object keys in Payload field/block configs are logically ordered, not alphabetical.
    "sort-keys": "off",
    // Codebase mixes function declarations and expressions intentionally (React hooks vs utilities).
    "func-style": "off",
    // PascalCase for React components is the project convention; renaming files breaks imports.
    "unicorn/filename-case": "off",
    // `!= null` is intentional nullish-only checks; conflicts with eqeqeq when both are errors.
    "no-eq-null": "off",
    // Tests, fixtures, and config files have justifiable inline comments.
    "no-inline-comments": "off",

    // Downgrades — keep as a nudge, not a blocker ───────────────────────
    // Variant management deletes dynamic keys; pattern is intentional in A/B and presets.
    "typescript/no-dynamic-delete": "warn",
    // Plugin uses parameter properties for DI in classes; the rule misses semantic intent.
    "typescript/parameter-properties": "warn",
    // Handlers intentionally scope helpers inside closures for state isolation.
    "unicorn/consistent-function-scoping": "warn",
    // Some legacy code reassigns params; not worth blocking commits over.
    "unicorn/prefer-default-parameters": "warn",
    // Callback-heavy preset logic uses promise chains for readability.
    "promise/prefer-await-to-then": "warn",
    // Large component files use forward refs intentionally for JSX readability.
    "no-use-before-define": "warn",
    // Most existing regexes are ASCII-only; `u` flag adds no safety.
    "require-unicode-regexp": "warn",
    // Field definitions sometimes mix inline type annotations with top-level type imports.
    "import/consistent-type-specifier-style": "warn",
  },
});
