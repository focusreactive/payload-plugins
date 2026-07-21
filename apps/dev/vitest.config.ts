import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";
import type { Plugin } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths() as Plugin],
  test: {
    environment: "jsdom",
    globals: false,
    include: ["{src,tests}/**/*.test.{ts,tsx}"],
    // Integration specs (*.int.test.ts) boot a real Payload and are LOCAL-ONLY — they run via the
    // separate `test:integration` project (vitest.integration.config.ts), never in this default/unit run.
    exclude: [...configDefaults.exclude, "**/*.int.test.{ts,tsx}"],
  },
  esbuild: { jsx: "automatic" },
});
