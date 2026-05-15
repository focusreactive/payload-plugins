import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
  },
  external: ["payload"],
  format: ["esm"],
  sourcemap: true,
  splitting: false,
});
