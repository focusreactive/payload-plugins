import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// printWidth is 100 so long function signatures and calls wrap onto multiple
// lines for readability rather than running off in one long line. Import and
// package.json key sorting stay off so `ultracite fix` doesn't churn unrelated
// ordering choices on save.
export default defineConfig({
  ...ultracite,
  printWidth: 100,
  sortImports: false,
  sortPackageJson: false,
  // Keep oxfmt's ignore set aligned with oxlint.config.ts so a whole-repo
  // `ultracite fix` never rewrites generated/committed files. ultracite's
  // shared ignores cover build output, but these project-specific paths
  // (committed, not gitignored) must be added explicitly — they were
  // previously protected by the now-removed root .prettierignore.
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "**/payload-types.ts",
    "**/importMap.js",
    "**/migrations/**",
    "apps/cms/scripts/**",
    "upload-data-scripta/**",
    // Markdown is excluded from formatting: oxfmt's markdown reflow is
    // non-idempotent on nested list/code blocks (it re-flips wrapped lines on
    // each run). READMEs / CHANGELOGs / docs stay hand-authored.
    "**/*.md",
    "**/*.mdx",
  ],
});
