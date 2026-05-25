import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    "adapters/payloadGlobal/index": "src/adapters/payloadGlobal/index.ts",
    "adapters/vercelEdge/index": "src/adapters/vercelEdge/index.ts",
    "admin/VariantsField": "src/admin/components/VariantsField.tsx",
    "analytics/adapters/googleAnalytics/index":
      "src/analytics/adapters/googleAnalytics/index.ts",
    "analytics/client": "src/analytics/client.ts",
    "analytics/index": "src/analytics/index.ts",
    index: "src/index.ts",
    "middleware/index": "src/middleware/index.ts",
  },
  external: [
    "payload",
    "react",
    "next",
    "@vercel/edge-config",
    "@payloadcms/ui",
  ],
  format: ["esm"],
  sourcemap: true,
  splitting: false,
});
