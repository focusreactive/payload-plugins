import type { Config } from "payload";
import { describe, expect, it } from "vitest";
import { seoTextField } from "../../src/fields/seoTextField";
import { resolveThresholds } from "../../src/utils/config/resolveThresholds";
import { validateSeoFieldRanges } from "../../src/utils/config/validateSeoFieldRanges";

function configWith(field: ReturnType<typeof seoTextField>): Pick<Config, "collections"> {
  return {
    collections: [
      {
        slug: "pages",
        fields: [
          {
            type: "tabs",
            tabs: [{ label: "SEO", fields: [{ name: "meta", type: "group", fields: [field] }] }],
          },
        ],
      },
    ],
  };
}

describe("validateSeoFieldRanges", () => {
  it("accepts field ranges that stay valid with the thresholds", () => {
    const field = seoTextField({ name: "description", kind: "description", range: { max: 150 } });
    const thresholds = resolveThresholds({ metaDescriptionLength: { min: 100, max: 140 } });

    expect(() => validateSeoFieldRanges(configWith(field), thresholds)).not.toThrow();
  });

  it("rejects a nested field whose own min passes the threshold max", () => {
    const field = seoTextField({ name: "description", kind: "description", range: { min: 150 } });
    const thresholds = resolveThresholds({ metaDescriptionLength: { min: 100, max: 140 } });

    expect(() => validateSeoFieldRanges(configWith(field), thresholds)).toThrow(
      'The description field "pages.meta.description" has range min (150) not lower than max (140)'
    );
  });
});
