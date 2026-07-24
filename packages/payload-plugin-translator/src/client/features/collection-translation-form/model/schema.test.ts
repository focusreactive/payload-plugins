import { describe, it, expect } from "vitest";

import { FORM_FIELDS } from "./constants";
import { validationSchema } from "./schema";

const base = {
  [FORM_FIELDS.SOURCE_LNG]: "en",
  [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: "posts",
  [FORM_FIELDS.STRATEGY]: "overwrite" as const,
  [FORM_FIELDS.PUBLISH_ON_TRANSLATION]: false,
};

describe("collection-translation-form target_lng", () => {
  it("accepts a single string (single mode)", () => {
    expect(validationSchema.safeParse({ ...base, [FORM_FIELDS.TARGET_LNG]: "de" }).success).toBe(
      true
    );
  });

  it("accepts a non-empty array (multi mode)", () => {
    expect(
      validationSchema.safeParse({ ...base, [FORM_FIELDS.TARGET_LNG]: ["de", "fr"] }).success
    ).toBe(true);
  });

  it("rejects an empty array (empty multi-select, AC7 client side)", () => {
    expect(validationSchema.safeParse({ ...base, [FORM_FIELDS.TARGET_LNG]: [] }).success).toBe(
      false
    );
  });

  it("rejects an empty string (single mode, nothing chosen)", () => {
    expect(validationSchema.safeParse({ ...base, [FORM_FIELDS.TARGET_LNG]: "" }).success).toBe(
      false
    );
  });
});
