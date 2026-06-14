import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths() as Plugin],
  test: {
    environment: "jsdom",
    globals: false,
    include: ["{src,tests}/**/*.test.{ts,tsx}"],
  },
  esbuild: { jsx: "automatic" },
});
