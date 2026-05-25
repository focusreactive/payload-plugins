import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// Override ultracite defaults that produced large amounts of churn against
// existing code (line wrapping at 80, alphabetical sorting of imports and
// package.json keys). Pre-commit still runs `ultracite fix` on staged files —
// these settings keep that fix from rewriting unrelated style choices.
export default defineConfig({
  ...ultracite,
  printWidth: 200,
  sortImports: false,
  sortPackageJson: false,
});
