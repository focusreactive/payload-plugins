import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.{ts,tsx}"],
  bundle: false,
  clean: false,
  dts: false,
  external: ["payload", "react", "react-dom", "next", "@payloadcms/ui"],
  format: ["esm"],
  sourcemap: true,
});
