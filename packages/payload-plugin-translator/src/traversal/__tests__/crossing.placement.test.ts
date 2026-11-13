import { describe, expect, it } from "vitest";

import { applyTranslations, collectTranslationTargets } from "../collect.js";
import type { Language, Step } from "../contract.js";
import { CannotEnterLanguageError } from "../errors/index.js";

type Doc = Record<string, unknown>;
type Held = { text: string };

const HOST = "host";
const FORMAT = "format";

const host = (): Language<string, Doc> => ({
  id: HOST,

  enter: ({ context }) => ({ nodes: ["held"], cursor: context as Doc }),

  step: (name, cursor): Step<string, Doc> => ({
    kind: "value",
    value: cursor[name],
    segments: [name],
    slot: { holder: cursor, key: name },
  }),

  selects: () => false,
  isEmpty: () => false,
  textUnits: () => [],

  boundary: (name, cursor, value) => ({
    languageId: FORMAT,
    context: {},
    placement: {
      slot: { holder: cursor, key: name },
      value: structuredClone(value),
    },
  }),
});

const isHeld = (value: unknown): value is Held =>
  typeof value === "object" && value !== null && typeof (value as Held).text === "string";

const format = (seen: unknown[]): Language<Held, null> => ({
  id: FORMAT,

  enter: ({ value }) => {
    seen.push(value);
    return isHeld(value) ? { nodes: [value], cursor: null } : null;
  },

  step: (node): Step<Held, null> => ({
    kind: "value",
    value: node.text,
    segments: [],
    slot: { holder: node, key: "text" },
  }),

  selects: () => true,
  isEmpty: () => false,
  textUnits: ({ value, slot }) =>
    slot === undefined
      ? []
      : [{ kind: "text", text: value as string, resolve: (t) => [{ slot, value: t }] }],
  boundary: () => null,
});

const walk = (document: Doc, seen: unknown[] = []) =>
  collectTranslationTargets({
    languages: [host(), format(seen)],
    entry: { languageId: HOST, context: document },
  });

describe("a crossing that hands over a copy", () => {
  it("writes nothing while the walk is collecting", () => {
    const document: Doc = { held: { text: "Buy now" } };
    const before = document.held;

    walk(document);

    expect(document.held).toBe(before);
    expect(document).toEqual({ held: { text: "Buy now" } });
  });

  it("names one placement, pointing at the position the value came from", () => {
    const document: Doc = { held: { text: "Buy now" } };

    const { placements } = walk(document);

    expect(placements).toHaveLength(1);
    expect(placements[0]?.slot).toEqual({ holder: document, key: "held" });
  });

  it("hands the receiving language the very object it named, not the original", () => {
    const document: Doc = { held: { text: "Buy now" } };
    const original = document.held;
    const seen: unknown[] = [];

    const { placements } = walk(document, seen);

    expect(seen[0]).toBe(placements[0]?.value);
    expect(seen[0]).not.toBe(original);
  });

  it("hands a placed null to the language instead of the offered value, and lets it refuse", () => {
    const placesNothing: Language<string, Doc> = {
      ...host(),
      boundary: (name, cursor) => ({
        languageId: FORMAT,
        context: {},
        placement: { slot: { holder: cursor, key: name }, value: null },
      }),
    };
    const seen: unknown[] = [];

    expect(() =>
      collectTranslationTargets({
        languages: [placesNothing, format(seen)],
        entry: { languageId: HOST, context: { held: { text: "Buy now" } } },
      })
    ).toThrow(CannotEnterLanguageError);

    expect(seen).toEqual([null]);
  });

  it("puts the copy in place when the answers are applied, and the answers land in it", () => {
    const document: Doc = { held: { text: "Buy now" } };

    const collected = walk(document);
    applyTranslations(collected, ["Jetzt kaufen"]);

    expect(document.held).toEqual({ text: "Jetzt kaufen" });
  });

  it.each<[string, ReadonlyArray<string | undefined>]>([
    ["no answers", []],
    ["only unanswered targets", [undefined]],
  ])("puts the copy in place with %s, keeping the text it was made from", (_name, answers) => {
    const document: Doc = { held: { text: "Buy now" } };
    const original = document.held;

    const collected = walk(document);
    applyTranslations(collected, answers);

    expect(document.held).toBe(collected.placements[0]?.value);
    expect(document.held).not.toBe(original);
    expect(document.held).toEqual({ text: "Buy now" });
  });
});

describe("a walk whose entry places its own content", () => {
  it("collects that placement too, and hands the content to the entry language", () => {
    const document: Doc = { held: { text: "untouched" } };
    const carried: Held = { text: "Buy now" };
    const seen: unknown[] = [];

    const collected = collectTranslationTargets({
      languages: [format(seen)],
      entry: {
        languageId: FORMAT,
        context: {},
        placement: { slot: { holder: document, key: "held" }, value: carried },
      },
    });

    expect(seen).toEqual([carried]);
    expect(document.held).toEqual({ text: "untouched" });

    applyTranslations(collected, ["Jetzt kaufen"]);

    expect(document.held).toBe(carried);
    expect(carried.text).toBe("Jetzt kaufen");
  });
});
