import { describe, expect, it } from "vitest";

import { applyTranslations, collectTranslationTargets } from "../collect.js";
import type { Language } from "../contract.js";
import { WriteRefusedError } from "../errors/index.js";

const HOLDER_ID = "one-frozen-leaf";

type Holder = { text: string };

const holderLanguage = (): Language<Holder, null> => ({
  id: HOLDER_ID,
  enter: ({ context }) => ({ nodes: [context as Holder], cursor: null }),
  step: (node) => ({
    kind: "value",
    value: node.text,
    segments: [],
    slot: { holder: node, key: "text" },
  }),
  selects: () => true,
  isEmpty: () => false,
  textUnits: ({ value, slot }) =>
    typeof value === "string" && slot !== undefined
      ? [{ kind: "text", text: value, resolve: (translated) => [{ slot, value: translated }] }]
      : [],
  boundary: () => null,
});

const targetsOver = (holder: Holder) =>
  collectTranslationTargets({
    languages: [holderLanguage()],
    entry: { languageId: HOLDER_ID, context: holder },
  });

describe("a position that refuses the write", () => {
  it("is reported rather than swallowed", () => {
    const frozen = Object.freeze({ text: "Buy now" });

    expect(() => applyTranslations(targetsOver(frozen), ["Jetzt kaufen"])).toThrow(
      WriteRefusedError
    );
    expect(frozen.text).toBe("Buy now");
  });

  it("writes normally where the position accepts it", () => {
    const open = { text: "Buy now" };

    applyTranslations(targetsOver(open), ["Jetzt kaufen"]);

    expect(open.text).toBe("Jetzt kaufen");
  });
});
