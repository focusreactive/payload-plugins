import { toWords } from "payload/shared";

import { walkSchema } from "../../../core/kernel/field-traversal/index.js";
import { isObject } from "../../../core/kernel/utils/isObject.js";

type LabelledBlock = {
  slug: string;
  labels?: { singular?: unknown; plural?: unknown };
  fields: ConfiguredField[];
};

/**
 * A tab carries no `type` of its own, so it is its own shape rather than a field.
 */
type LabelledTab = {
  name?: string;
  localized?: boolean;
  label?: unknown;
  fields: ConfiguredField[];
};

/**
 * Payload fills `label` and a list's `labels` during sanitize, so this reader must be given the
 * sanitized config — the one the plugin's `schemaMap` snapshot is deliberately not.
 */
export type ConfiguredField = {
  type: string;
  name?: string;
  localized?: boolean;
  required?: boolean;
  custom?: Record<string, unknown>;
  label?: unknown;
  labels?: { singular?: unknown; plural?: unknown };
  fields?: ConfiguredField[];
  blocks?: LabelledBlock[];
  blockReferences?: (string | LabelledBlock)[];
  tabs?: LabelledTab[];
};

export type FieldPresentation = { label: string; required: boolean };

export type CollectionPresentation = {
  /** What the config says about the field at this name path, or nothing where it has no such field. */
  at: (path: readonly string[]) => FieldPresentation | undefined;
};

const keyOf = (path: readonly string[]): string => path.join(".");

function fromLanguages(label: Record<string, unknown>, language: string | undefined): unknown {
  const asked = language === undefined ? undefined : label[language];
  return asked ?? label.en ?? Object.values(label)[0];
}

function labelOf(label: unknown, name: string, language: string | undefined): string {
  if (typeof label === "string") return label;
  if (isObject(label)) {
    const chosen = fromLanguages(label, language);
    if (typeof chosen === "string") return chosen;
  }
  return toWords(name);
}

export function collectionPresentation(input: {
  fields: readonly ConfiguredField[];
  sharedBlocks?: readonly LabelledBlock[];
  language?: string;
}): CollectionPresentation {
  const { language } = input;
  const shared = new Map((input.sharedBlocks ?? []).map((block) => [block.slug, block]));
  const found = new Map<string, FieldPresentation>();

  const record = (
    path: readonly string[],
    label: unknown,
    name: string,
    required = false
  ): void => {
    found.set(keyOf(path), { label: labelOf(label, name, language), required });
  };

  walkSchema(input.fields, {
    blocksOf: (field) =>
      (field.blockReferences ?? field.blocks ?? []).flatMap((block) => {
        if (typeof block !== "string") return [block];
        const referenced = shared.get(block);
        return referenced ? [referenced] : [];
      }),
    visit: (node) => {
      if (node.kind === "tab") return record(node.path, node.tab.label, node.name);
      if (node.kind === "element") {
        const singular = node.block ? node.block.labels?.singular : node.field.labels?.singular;
        return record(node.path, singular, node.name);
      }
      const required = node.kind !== "group" && node.field.required === true;
      return record(node.path, node.field.label, node.name, required);
    },
  });

  return { at: (path) => found.get(keyOf(path)) };
}
