import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Red-run config. Identical to `vitest.config.ts` except that every import of `targetLayer`
 * resolves to a stub that throws. A check that still passes under this config passes with no
 * implementation behind it, and is therefore guarding nothing.
 *
 *   red:   bunx vitest run -c vitest.red.config.ts <file>
 *   green: bunx vitest run <file>
 *
 * The redirect lives here rather than in a test or in src, so the file that goes red is
 * byte-for-byte the file that goes green.
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
        find: /^\.\/targetLayer$/u,
        replacement: resolve(__dirname, "__stubs__/targetLayer.stub.ts"),
      },
    ],
  },
});
