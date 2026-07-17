import { describe, it, expect } from "vitest";

import { AUTO_TRANSLATE_CUSTOM_KEY } from "../../../../core/auto-translate-config";
import type { AutoTranslateConfig } from "../../../../core/auto-translate-config";

import { resolveAutoTranslateSummary } from "./resolveAutoTranslateSummary";

const withConfig = (config: AutoTranslateConfig) => ({
  custom: { [AUTO_TRANSLATE_CUSTOM_KEY]: config },
});

describe("resolveAutoTranslateSummary", () => {
  it("returns null for a collection that is not opted in", () => {
    expect(resolveAutoTranslateSummary({ custom: {} }, "en")).toBeNull();
    expect(resolveAutoTranslateSummary(undefined, "en")).toBeNull();
  });

  it("resolves the source from the default locale and excludes it from the targets", () => {
    const result = resolveAutoTranslateSummary(withConfig({ targets: ["en", "de", "fr"] }), "en");
    expect(result).toEqual({ targets: ["de", "fr"], sourceLocale: "en" });
  });

  it("honours a per-collection sourceLocale override", () => {
    const result = resolveAutoTranslateSummary(
      withConfig({ targets: ["en", "de"], sourceLocale: "de" }),
      "en"
    );
    expect(result).toEqual({ targets: ["en"], sourceLocale: "de" });
  });

  it("returns null when no source locale is resolvable", () => {
    expect(resolveAutoTranslateSummary(withConfig({ targets: ["de"] }), undefined)).toBeNull();
  });

  it("returns null when the only target is the source (nothing left to show)", () => {
    expect(resolveAutoTranslateSummary(withConfig({ targets: ["en"] }), "en")).toBeNull();
  });
});
