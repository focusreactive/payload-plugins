import { describe, expect, it } from "vitest";

import { collectTranslationTargets } from "../collect.js";
import type { Language } from "../contract.js";
import { sentTextsOf } from "./fixtures/sentText.js";

const named = <Id extends string>(id: Id): Language<string, null> & { id: Id } => ({
  id,
  enter: () => ({ nodes: ["leaf"], cursor: null }),
  step: () => ({ kind: "value", value: `from ${id}`, segments: [id] }),
  selects: () => true,
  isEmpty: () => false,
  textUnits: ({ value }) => [{ kind: "text", text: value as string, resolve: () => [] }],
  boundary: () => null,
});

const fields = named("payload-fields");
const rich = named("lexical");

const idTypedAsPlainString: Language<string, null> = {
  ...named("whatever"),
  id: "whatever" as string,
};

describe("the entry id is checked where both halves meet", () => {
  it("accepts an id one of the languages actually has, and enters that one", () => {
    const { targets } = collectTranslationTargets({
      languages: [fields, rich],
      entry: { languageId: "payload-fields", context: {} },
    });

    expect(sentTextsOf(targets)).toEqual(["from payload-fields"]);
  });

  it("leaves a language whose id is a plain string exactly as it was", () => {
    const { targets } = collectTranslationTargets({
      languages: [idTypedAsPlainString],
      entry: { languageId: "whatever", context: {} },
    });

    expect(sentTextsOf(targets)).toEqual(["from whatever"]);
  });
});
