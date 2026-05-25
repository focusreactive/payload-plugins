import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";

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
});
