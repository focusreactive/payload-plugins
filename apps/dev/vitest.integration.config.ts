import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vitest/config";

// Integration tests: boot a REAL Payload (node env, sqlite). LOCAL-ONLY — run via `test:integration`,
// never in CI, and excluded from the default unit run (see vitest.config.ts). Serialized single fork so
// concurrent sqlite boots can't collide.
export default defineConfig({
  plugins: [tsconfigPaths() as Plugin],
  test: {
    environment: "node",
    globals: false,
    include: ["src/integration/**/*.int.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Serial, but each spec file gets its OWN fresh isolated fork: booting more than one Payload in a
    // single process collides on Payload's module-level singletons (corrupts the DB adapter). One boot
    // per file + fresh process per file avoids that.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: false, isolate: true } },
  },
  esbuild: { jsx: "automatic" },
});
