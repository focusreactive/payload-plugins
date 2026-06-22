import { describe, expect, it } from "vitest";
import {
  PAGE_PARAM_KEYS,
  SYNTHETIC_REF_PREFIX,
  DEFAULT_PAGE_DIMENSIONS,
} from "../../src/constants/page";

describe("page constants", () => {
  it("exposes stable gtag param keys", () => {
    expect(PAGE_PARAM_KEYS).toEqual({ pageRef: "fr_page_ref", contentLocale: "fr_content_locale" });
  });

  it("synthetic refs use the __ prefix", () => {
    expect(SYNTHETIC_REF_PREFIX).toBe("__");
  });

  it("default GA4 dimension api names match the fr_* precedent", () => {
    expect(DEFAULT_PAGE_DIMENSIONS).toEqual({
      pageRef: "customEvent:fr_page_ref",
      contentLocale: "customEvent:fr_content_locale",
    });
  });
});
