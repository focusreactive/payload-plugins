import { defineConfig } from "tsup";

export default defineConfig({
  bundle: false,
  clean: true,
  dts: false,
  entry: ["src/**/*.{ts,tsx}"],
  external: [
    "payload",
    "react",
    "react-dom",
    "next",
    "@payloadcms/ui",
    "@payloadcms/plugin-multi-tenant",
    "resend",
  ],
  format: ["esm"],
  onSuccess: "tailwindcss -i src/styles.css -o dist/styles.css --minify",
  sourcemap: true,
});
