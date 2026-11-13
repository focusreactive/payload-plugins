import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const SPECS_THAT_RUN_PAYLOAD = ["tests/realPayload/**/*.int.spec.ts"];

const SPECS_OF_SERVER_CODE = [
  "tests/server/latestReads.int.spec.ts",
  "tests/server/unsavedRichTextWithoutSchemaCache.int.spec.ts",
];

const SPECS_WITHOUT_A_DOM = [
  "tests/admin/previewSession.int.spec.ts",
  "tests/instantPreview/unsavedRender.int.spec.ts",
];

const SPECS_THAT_RUN_PAYLOAD_NEXT_TO_A_DOM = [
  "tests/realPayload/realPayloadRichTextLive.int.spec.ts",
];

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ...SPECS_THAT_RUN_PAYLOAD_NEXT_TO_A_DOM.map((glob): [string, "jsdom"] => [glob, "jsdom"]),
      ...[...SPECS_THAT_RUN_PAYLOAD, ...SPECS_OF_SERVER_CODE, ...SPECS_WITHOUT_A_DOM].map(
        (glob): [string, "node"] => [glob, "node"]
      ),
    ],
    globals: false,
    include: ["tests/**/*.spec.{ts,tsx}"],
  },
});
