import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [["tests/**/*.dom.spec.ts", "jsdom"]],
    include: ["tests/**/*.spec.ts"],
  },
});
