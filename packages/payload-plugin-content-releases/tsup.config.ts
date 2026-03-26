import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    splitting: false,
    clean: true,
    external: ["payload"],
  },
  {
    entry: {
      client: "src/client.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    splitting: false,
    clean: false,
    banner: {
      js: '"use client";',
    },
    external: ["payload", "@payloadcms/ui", "react", "react/jsx-runtime"],
  },
]);
