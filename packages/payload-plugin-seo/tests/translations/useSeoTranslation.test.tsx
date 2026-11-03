// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildTranslations } from "../../src/translations";
import { useSeoTranslation } from "../../src/translations/useSeoTranslation";

// vi.unmock / vi.mock / vi.hoisted run before the imports above.
vi.unmock("../../src/translations/useSeoTranslation");

const i18n = vi.hoisted(() => ({
  current: { language: "cs", translations: {} as Record<string, unknown> },
}));

vi.mock("@payloadcms/ui", () => ({
  useTranslation: () => ({ i18n: i18n.current }),
}));

describe("useSeoTranslation", () => {
  it("reads the admin language's strings from Payload's i18n", () => {
    i18n.current = { language: "cs", translations: buildTranslations().cs ?? {} };
    const { result } = renderHook(() => useSeoTranslation());
    expect(result.current.language).toBe("cs");
    expect(result.current.t("tab.keyphrase")).toBe("Klíčová fráze");
  });

  it("falls back to English when Payload has none of the plugin's strings", () => {
    i18n.current = { language: "fr", translations: {} };
    const { result } = renderHook(() => useSeoTranslation());
    expect(result.current.t("tab.keyphrase")).toBe("Keyphrase");
  });
});
