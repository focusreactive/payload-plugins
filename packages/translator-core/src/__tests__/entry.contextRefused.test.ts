import { describe, expect, it } from "vitest";

import { collectTranslationTargets } from "../collect.js";
import type { Language } from "../contract.js";
import { CannotEnterLanguageError } from "../errors/index.js";
import type { Doc, FieldLike } from "./fixtures/payloadFields.js";
import { payloadFieldsLanguage } from "./fixtures/payloadFields.js";

const schema: FieldLike[] = [{ type: "text", name: "title", localized: true }];
const UNREGISTERED_ID = "payload-field";

const sometimesEmpty = (): Language<unknown, unknown> => {
  const language: Language<unknown, unknown> = {
    ...payloadFieldsLanguage(),
    id: "sometimes-empty",
    enter: ({ context }) => {
      const carried = context as { fields?: FieldLike[] };
      if (carried.fields === undefined) return null;
      if (carried.fields.length === 0) return { nodes: [], cursor: { source: {}, target: {} } };
      return payloadFieldsLanguage().enter({ context });
    },
  };
  return language;
};

const ownContext = () => ({ fields: schema, source: { title: "Hi" }, target: { title: "Hi" } });

const refusesWithoutFieldList = (): Language<unknown, unknown> => ({
  ...payloadFieldsLanguage(),
  id: "refuses-without-field-list",
  enter: ({ context }) => {
    const carried = context as { fields?: unknown };
    if (!Array.isArray(carried.fields)) return null;
    return payloadFieldsLanguage().enter({ context });
  },
});

const enterWith = (language: Language<unknown, unknown>, context: unknown) =>
  collectTranslationTargets({
    languages: [language],
    entry: { languageId: language.id, context },
  });

/** Asserting the class by instance, not through `toThrow`, which passes on anything when it is absent. */
const thrownBy = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("nothing was thrown");
};

describe("a language handed a context that is not its own", () => {
  it("refuses it, and the walk says which language and where", () => {
    const error = thrownBy(() =>
      enterWith(refusesWithoutFieldList(), { tree: "a context for someone else" })
    );

    expect(error).toBeInstanceOf(CannotEnterLanguageError);
    expect((error as CannotEnterLanguageError).languageId).toBe("refuses-without-field-list");
  });

  it("still walks its own context, so refusing is not the same as never working", () => {
    const targets = enterWith(refusesWithoutFieldList(), ownContext());

    expect(targets.map((target) => target.text)).toEqual(["Hi"]);
  });

  it("leaves a refusal without a cause, so the two are told apart", () => {
    const error = thrownBy(() =>
      enterWith(refusesWithoutFieldList(), { tree: "a context for someone else" })
    );

    expect(error).toBeInstanceOf(CannotEnterLanguageError);
    expect("cause" in (error as object)).toBe(false);
  });

  it("reports a language that breaks on the context rather than refusing it", () => {
    const brittle: Language<unknown, unknown> = {
      ...payloadFieldsLanguage(),
      id: "brittle",
      enter: ({ context }) => {
        const carried = context as { fields: { length: number }[] };
        return { nodes: carried.fields.length === 0 ? [] : carried.fields, cursor: {} };
      },
    };

    const error = thrownBy(() => enterWith(brittle, { nothing: "it expects" }));

    expect(error).toBeInstanceOf(CannotEnterLanguageError);
    expect((error as CannotEnterLanguageError).cause).toBeInstanceOf(TypeError);
  });

  it("turns the silent case loud once the language refuses", () => {
    const refusing: Language<unknown, unknown> = {
      ...payloadFieldsLanguage(),
      id: "refusing",
      enter: ({ context }) => {
        const carried = context as { fields?: FieldLike[] };
        if (carried.fields === undefined) return null;
        return payloadFieldsLanguage().enter({ context });
      },
    };

    const error = thrownBy(() => enterWith(refusing, { tree: "someone else's" }));

    expect(error).toBeInstanceOf(CannotEnterLanguageError);
    expect((error as CannotEnterLanguageError).languageId).toBe("refusing");
  });

  it("cannot tell when a language neither refuses nor breaks — the limit of this guard", () => {
    const careless: Language<unknown, unknown> = {
      ...payloadFieldsLanguage(),
      id: "careless",
      enter: ({ context }) => {
        const carried = context as { fields?: FieldLike[]; source?: Doc; target?: Doc };
        return {
          nodes: carried.fields ?? [],
          cursor: { source: carried.source ?? {}, target: carried.target ?? {} },
        };
      },
    };

    expect(enterWith(careless, { tree: "someone else's" })).toEqual([]);
    expect(enterWith(careless, ownContext()).map((target) => target.text)).toEqual(["Hi"]);
  });

  it("reads an empty node list as a valid answer, not a refusal", () => {
    // Both halves, because the subject is the difference between them: one of these must throw
    // and the other must not, and either alone is satisfied by a walk that does nothing.
    expect(enterWith(sometimesEmpty(), { ...ownContext(), fields: [] })).toEqual([]);
    expect(() => enterWith(sometimesEmpty(), { noFieldsAtAll: true })).toThrow(
      CannotEnterLanguageError
    );
  });

  it("still walks that same language when its context does have fields", () => {
    expect(enterWith(sometimesEmpty(), ownContext()).map((one) => one.text)).toEqual(["Hi"]);
  });
});

describe("the entry still reports an id nobody registered", () => {
  it("names what is registered, as it did before", () => {
    expect(() =>
      collectTranslationTargets({
        languages: [payloadFieldsLanguage()],
        entry: { languageId: UNREGISTERED_ID, context: ownContext() },
      })
    ).toThrow(/registered: payload-fields/u);
  });
});
