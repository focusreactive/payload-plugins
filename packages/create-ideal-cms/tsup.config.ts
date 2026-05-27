import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  target: "node18",
  platform: "node",
  sourcemap: false,
  splitting: false,
  clean: true,
  shims: false,
  banner: { js: "#!/usr/bin/env node" },
});
