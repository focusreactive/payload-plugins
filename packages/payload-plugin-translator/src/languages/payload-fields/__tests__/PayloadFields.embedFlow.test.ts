import { describe, expect, it } from "vitest";

import type { BlockLike, FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { isObject } from "../../../core/kernel/utils/isObject.js";
import { collectTranslationTargets } from "../../../traversal/index.js";
import type { Crossing, Language, Step } from "../../../traversal/index.js";
import type { EmbedIdentity, EmbedResolver } from "../../embedCrossing.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../PayloadFields.language.js";

const ONE_LIST_FORMAT = "one-list-format";

const cta: BlockLike = {
  slug: "cta",
  fields: [{ type: "text", name: "heading", localized: true }],
};

const oneListFormat = (
  asked: EmbedIdentity[],
  answers: (Crossing | null)[]
): Language<string, EmbedResolver> => ({
  id: ONE_LIST_FORMAT,

  enter: ({ context }) => {
    if (!isObject(context) || typeof context.embed !== "function") return null;
    return { nodes: ["the-embed"], cursor: context.embed as EmbedResolver };
  },

  step: (): Step<string, EmbedResolver> => ({ kind: "value", value: null, segments: [] }),

  selects: () => false,
  isEmpty: () => true,
  textUnits: () => [],

  boundary: (_node, embed) => {
    const identity: EmbedIdentity = { name: "cta", data: { blockType: "cta", heading: "Buy now" } };
    asked.push(identity);
    const answer = embed(identity);
    answers.push(answer);
    return answer;
  },
});

const schema: FieldLike[] = [{ type: "richText", name: "body", localized: true }];

const document = () => ({ body: { any: "shape the format claims" } });

const walk = (blocks: readonly BlockLike[]) => {
  const asked: EmbedIdentity[] = [];
  const answers: (Crossing | null)[] = [];
  const source = document();
  const collected = collectTranslationTargets({
    languages: [
      payloadFieldsLanguage({
        crossings: [
          {
            languageId: ONE_LIST_FORMAT,
            // Recognises its own value by shape, as a real format does. Without this it would also
            // claim the string leaves inside the block it just resolved, and cross forever.
            open: ({ value, embed }) =>
              isObject(value) ? { context: { embed }, workingCopy: value } : null,
          },
        ],
        blocks,
      }),
      oneListFormat(asked, answers),
    ],
    entry: {
      languageId: PAYLOAD_FIELDS_ID,
      context: { fields: schema, data: structuredClone(source), source },
    },
  });
  return { asked, answers, collected };
};

describe("a format that names no kind of embed", () => {
  it("is asked, so the host really did get the chance to answer", () => {
    expect(walk([cta]).asked).toEqual([
      { name: "cta", data: { blockType: "cta", heading: "Buy now" } },
    ]);
  });

  it("is answered by slug, because the host keeps one table and has nothing to guess between", () => {
    expect(walk([cta]).answers).toEqual([
      {
        languageId: PAYLOAD_FIELDS_ID,
        context: {
          fields: cta.fields,
          data: { blockType: "cta", heading: "Buy now" },
          source: { blockType: "cta", heading: "Buy now" },
        },
      },
    ]);
  });

  it("is still refused for a slug the table does not hold", () => {
    expect(walk([]).answers).toEqual([null]);
  });
});
