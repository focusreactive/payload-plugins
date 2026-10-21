import type { BlockLike, FieldLike } from "../../../core/kernel/field-traversal/index.js";
import { isObject } from "../../../core/kernel/utils/isObject.js";
import type {
  IdPath,
  RegisteredLanguage,
  TranslationTarget,
} from "../../../core/traversal/index.js";
import {
  CannotEnterLanguageError,
  collectTranslationTargets,
} from "../../../core/traversal/index.js";
import type { EmbedResolver } from "../../richTextCrossing.js";
import { LEXICAL_ID, lexicalLanguage } from "../../Lexical.language.js";
import { PAYLOAD_FIELDS_ID, payloadFieldsLanguage } from "../../PayloadFields.language.js";

export type Doc = Record<string, unknown>;

/** A serialized Lexical node as Payload stores it, written loosely enough to build broken ones. */
export type Node = {
  type: string;
  version: number;
  text?: string;
  children?: Node[];
  fields?: unknown;
};

export type Tree = { root: Node };

export const text = (value: string): Node => ({ type: "text", version: 1, text: value });

export const element = (type: string, ...children: Node[]): Node => ({
  type,
  version: 1,
  children,
});

export const paragraph = (...children: Node[]): Node => element("paragraph", ...children);

/** Payload's own serialized block node carries version 2; every other node here carries 1. */
const BLOCK_NODE_VERSION = 2;

export const block = (fields: unknown): Node => ({
  type: "block",
  version: BLOCK_NODE_VERSION,
  fields,
});

export const inlineBlock = (fields: unknown): Node => ({ type: "inlineBlock", version: 1, fields });

export const tree = (...children: Node[]): Tree => ({ root: element("root", ...children) });

export const translated = (value: string): string => `[de] ${value}`;

export function dig(value: unknown, ...keys: readonly (string | number)[]): unknown {
  let here = value;
  for (const key of keys) {
    if (typeof key === "number") {
      if (!Array.isArray(here)) return undefined;
      here = here[key];
    } else {
      if (!isObject(here)) return undefined;
      here = here[key];
    }
  }
  return here;
}

/**
 * The kernel wraps any throw from inside `enter` as `CannotEnterLanguageError` with the original on
 * `cause`; re-raising the original keeps a crash from reading as a refusal.
 */
export function surfacingEnterCrash<T>(run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof CannotEnterLanguageError && error.cause !== undefined) {
      throw error.cause;
    }
    throw error;
  }
}

export type Reported = { idPath: IdPath; value: unknown };

export type Walked = { targets: TranslationTarget[]; working: Doc; reported: Reported[] };

/**
 * Mirrors the wiring the swap will install — change it with that wiring, not for one check.
 */
export function walkDocument(options: {
  schema: FieldLike[];
  source: Doc;
  blocks?: readonly BlockLike[];
  inlineBlocks?: readonly BlockLike[];
}): Walked {
  const working = structuredClone(options.source);
  const reported: Reported[] = [];

  const targets = surfacingEnterCrash(() =>
    collectTranslationTargets({
      languages: [
        payloadFieldsLanguage({
          languageId: LEXICAL_ID,
          blocks: options.blocks ?? [],
          inlineBlocks: options.inlineBlocks ?? [],
        }),
        lexicalLanguage(),
      ],
      entry: {
        languageId: PAYLOAD_FIELDS_ID,
        context: { fields: options.schema, data: working, source: options.source },
      },
      onSelectedWithoutText: (idPath, value) => reported.push({ idPath, value }),
    })
  );

  return { targets, working, reported };
}

export function walkTree(
  context: unknown,
  others: readonly RegisteredLanguage[] = []
): TranslationTarget[] {
  return surfacingEnterCrash(() =>
    collectTranslationTargets({
      languages: [lexicalLanguage(), ...others],
      entry: { languageId: LEXICAL_ID, context },
    })
  );
}

export const claimsNothing: EmbedResolver = () => null;
