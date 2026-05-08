import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.{ts,tsx}"],
  bundle: false,
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  external: ["payload", "react", "react-dom", "next", "@payloadcms/ui"],
});
