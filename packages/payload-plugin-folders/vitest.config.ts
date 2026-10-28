import { defineConfig } from "vitest/config";

const integrationTimeoutMs = 60_000;

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "int",
          environment: "node",
          globalSetup: ["tests/helpers/postgresGlobalSetup.ts"],
          hookTimeout: integrationTimeoutMs,
          include: ["tests/int/**/*.int.test.ts"],
          // One file per worker: each file owns its Payload instance and its database.
          isolate: true,
          pool: "forks",
          testTimeout: integrationTimeoutMs,
        },
      },
    ],
  },
});
