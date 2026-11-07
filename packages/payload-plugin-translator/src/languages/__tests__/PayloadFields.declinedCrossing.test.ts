import { describe, expect, it } from "vitest";

import { collectTranslationTargets } from "../../core/traversal/index.js";
import type { FieldLike } from "../../core/kernel/field-traversal/index.js";
import type { ContentCrossing, ContentOffer } from "../contentCrossing.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";
import type { Tree } from "./fixtures/lexical.js";
import { text, tree } from "./fixtures/lexical.js";

type Body = { body: Tree };

const schema: FieldLike[] = [{ type: "richText", name: "body", localized: true }];

const english = (): Body => ({ body: tree(text("Buy now")) });

const german = (): Body => ({ body: tree(text("Jetzt kaufen")) });

const walk = (crossings: readonly ContentCrossing[], working: Body) =>
  collectTranslationTargets({
    languages: [payloadFieldsLanguage({ crossings })],
    entry: {
      languageId: PAYLOAD_FIELDS_ID,
      context: { fields: schema, data: working, source: english() },
    },
  });

describe("what a crossing is handed", () => {
  it("is a value and a way to ask about embeds, and nothing it could write with", () => {
    const seen: ContentOffer[] = [];
    const records: ContentCrossing = (offer) => {
      seen.push(offer);
      return null;
    };

    walk([records], german());

    expect(seen).toHaveLength(1);
    expect(Object.keys(seen[0] ?? {}).sort()).toEqual(["embed", "value"]);
  });
});

describe("a crossing that does not take the value", () => {
  it("declining leaves the stored value exactly as it was", () => {
    const working = german();
    const before = working.body;

    expect(walk([() => null], working).targets).toEqual([]);
    expect(working.body).toBe(before);
  });

  it("accepting without a working copy leaves the stored value exactly as it was", () => {
    const working = german();
    const before = working.body;
    const keepsNothing: ContentCrossing = () => ({
      languageId: PAYLOAD_FIELDS_ID,
      context: { fields: [], data: {}, source: {} },
    });

    walk([keepsNothing], working);

    expect(working.body).toBe(before);
  });
});
