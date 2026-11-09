import { vi } from "vitest";

vi.mock("../../src/translations/useSeoTranslation", async () => {
  const { createTranslator } = await import("../../src/translations/translate");
  const t = createTranslator("en", undefined);
  return { useSeoTranslation: () => ({ t, language: "en" }) };
});
