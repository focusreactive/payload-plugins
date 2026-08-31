import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Runs the suite against a `targetLayer` stub that throws, so a check that still passes is proven
 * to be guarding nothing:
 *   bunx vitest run -c vitest.red.config.ts <file>
 *
 * The alias lives here rather than in a test, so the red and green runs execute the identical file.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: [
      {
        // First, and exact: the stub imports the real module for its types. Without this it would
        // match the rule below and resolve to itself.
        find: "../src/server/features/translate-document/targetLayer",
        replacement: resolve(__dirname, "src/server/features/translate-document/targetLayer.ts"),
      },
      {
        // Any path ending in `targetLayer`, not just `./targetLayer`: an importer one directory
        // away would otherwise slip past the stub and report green — the false pass this config
        // exists to catch.
        find: /^.*targetLayer$/u,
        replacement: resolve(__dirname, "__stubs__/targetLayer.stub.ts"),
      },
    ],
  },
});
