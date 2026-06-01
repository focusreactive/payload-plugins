import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "admin/AiPageBuilderButton": "src/admin/components/AiPageBuilderButton.tsx",
    "admin/AiPageBuilderButton.server": "src/admin/components/AiPageBuilderButton.server.tsx",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  external: ["payload", "react", "next", "@payloadcms/ui", "ai", "zod"],
});
