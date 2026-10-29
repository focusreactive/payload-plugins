import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.{ts,tsx,css}"],
  bundle: false,
  clean: false,
  dts: false,
  external: ["payload", "react", "react-dom", "next", "@payloadcms/ui"],
  format: ["esm"],
  // The admin's stylesheet is imported by a client component, so it has to sit next to the output.
  loader: { ".css": "copy" },
  sourcemap: true,
});
