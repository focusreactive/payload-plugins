import { vi } from "vitest";

// Components read their strings through `useSeoTranslation`, which needs
// Payload's translation context. Component tests render without the admin,
// so they get the English strings directly; `useSeoTranslation.test.tsx`
// unmocks it to test the hook itself.
vi.mock("../../src/translations/useSeoTranslation", async () => {
  const { createTranslator } = await import("../../src/translations/translate");
  const t = createTranslator("en", undefined);
  return { useSeoTranslation: () => ({ t, language: "en" }) };
});
