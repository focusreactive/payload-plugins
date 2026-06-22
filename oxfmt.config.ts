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
  // Keep oxfmt's ignore set aligned with oxlint.config.ts so a whole-repo
  // `ultracite fix` never rewrites generated/committed files. ultracite's
  // shared ignores cover build output, but these project-specific paths
  // (committed, not gitignored) must be added explicitly — they were
  // previously protected by the now-removed root .prettierignore.
  ignorePatterns: [...(ultracite.ignorePatterns ?? []), "**/payload-types.ts", "**/importMap.js", "**/migrations/**", "apps/cms/scripts/**", "upload-data-scripta/**"],
});
