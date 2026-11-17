import type { LiveRichTextField, VeFieldPatchMessage } from "../../../shared/protocol.js";
import type { ValueSource } from "./valueSource.js";

import { isMessageFrom } from "../../../shared/messageSource.js";
import { isPlainObject } from "../../../shared/plainObject.js";
import { VE_DOCUMENT_SAVED_TYPE, VE_FIELD_PATCH_TYPE } from "../../../shared/protocol.js";
import { rootOf } from "../../../shared/richText/editorNodes.js";
import { fieldKeyOfRichTextNode } from "../../../shared/richText/nodeKey.js";
import { hasReferences } from "../../../shared/richText/references.js";
import { fieldAddressOf, isVeDocument, keyedFieldAddressOf } from "../../../shared/veDocument.js";
import { adminOriginOf, findAdminWindow } from "../../adminWindow.js";

export type Base = { base: unknown };

export interface BaseValues {
  watch(field: LiveRichTextField, hasReferences: boolean, onBase: () => void): () => void;
  baseOf(field: LiveRichTextField, locale: string | undefined, state: unknown): Base | null;
  answerFor(field: LiveRichTextField, locale: string | undefined): (value: unknown) => void;
  stop(): void;
}

type InLocale = { locale: string | undefined; value: unknown };

type FieldBase = {
  field: LiveRichTextField;
  hasReferences: boolean;
  watchers: Set<() => void>;
  saved: InLocale | null;
  answered: InLocale | null;
  asking: object | null;
};

const ROOT_NODE_TYPE = "root";

const NO_BASE: Base = { base: null };

const patchMessageOf = (data: unknown): VeFieldPatchMessage | null => {
  if (!isPlainObject(data) || data.type !== VE_FIELD_PATCH_TYPE || !isVeDocument(data)) return null;
  const isLocale = data.locale === undefined || typeof data.locale === "string";
  return isLocale && Array.isArray(data.patches) ? (data as VeFieldPatchMessage) : null;
};

const typedFieldKeysOf = ({ patches }: VeFieldPatchMessage): Set<string> =>
  new Set(
    patches.flatMap((patch) => {
      const fieldKey =
        isPlainObject(patch) && typeof patch.key === "string"
          ? fieldKeyOfRichTextNode(patch.key)
          : null;
      return fieldKey === null ? [] : [fieldKey];
    })
  );

const mergedBase = (values: readonly unknown[]): unknown =>
  values.length === 1
    ? values[0]
    : { root: { children: values.map(rootOf).filter(Boolean), type: ROOT_NODE_TYPE } };

const inLocale = (located: InLocale | null, locale: string | undefined): unknown[] =>
  located && located.locale === locale ? [located.value] : [];

export function createBaseValues(adminOrigin: () => string, source: ValueSource): BaseValues {
  const fields = new Map<string, FieldBase>();
  let generation = 0;
  let isSavedSincePageLoad = false;

  const needsSaved = (entry: FieldBase, state: unknown) =>
    (entry.hasReferences || isSavedSincePageLoad) && hasReferences(state);

  const askForSaved = async (entry: FieldBase, locale: string | undefined) => {
    if (entry.asking !== null || !source.canAsk()) return;
    const asking = {};
    const askedIn = generation;
    entry.asking = asking;
    const value = await source.value({ field: entry.field, locale }).catch(() => null);
    if (entry.asking !== asking) return;
    entry.asking = null;
    if (value === null || askedIn !== generation) return;
    entry.saved = { locale, value };
    for (const onBase of entry.watchers) onBase();
  };

  const askForTyped = (message: VeFieldPatchMessage) => {
    for (const fieldKey of typedFieldKeysOf(message)) {
      const entry = fields.get(fieldAddressOf(message, fieldKey));
      const hasSaved = inLocale(entry?.saved ?? null, message.locale).length > 0;
      if (entry?.hasReferences && !hasSaved) void askForSaved(entry, message.locale);
    }
  };

  const forgetBases = () => {
    generation += 1;
    isSavedSincePageLoad = true;
    for (const entry of fields.values()) {
      entry.saved = null;
      entry.answered = null;
      entry.asking = null;
    }
  };

  const handleAdminMessage = (event: MessageEvent) => {
    if (!isMessageFrom(event, adminOriginOf(adminOrigin()), findAdminWindow(window))) return;
    if (isPlainObject(event.data) && event.data.type === VE_DOCUMENT_SAVED_TYPE) {
      forgetBases();
      return;
    }
    const typed = patchMessageOf(event.data);
    if (typed) askForTyped(typed);
  };
  window.addEventListener("message", handleAdminMessage);

  return {
    answerFor(field, locale) {
      const askedIn = generation;
      return (value) => {
        const entry = fields.get(keyedFieldAddressOf(field));
        if (entry && askedIn === generation) entry.answered = { locale, value };
      };
    },
    baseOf(field, locale, state) {
      const entry = fields.get(keyedFieldAddressOf(field));
      if (!entry) return null;
      const values = [...inLocale(entry.saved, locale), ...inLocale(entry.answered, locale)];
      if (values.length > 0) return { base: mergedBase(values) };
      if (!needsSaved(entry, state)) return NO_BASE;
      void askForSaved(entry, locale);
      return null;
    },
    stop: () => window.removeEventListener("message", handleAdminMessage),
    watch(field, fieldHasReferences, onBase) {
      const address = keyedFieldAddressOf(field);
      const entry = fields.get(address) ?? {
        answered: null,
        asking: null,
        field,
        hasReferences: false,
        saved: null,
        watchers: new Set(),
      };
      const watcher = () => onBase();
      entry.hasReferences ||= fieldHasReferences;
      entry.watchers.add(watcher);
      fields.set(address, entry);
      return () => {
        entry.watchers.delete(watcher);
        if (entry.watchers.size === 0 && fields.get(address) === entry) fields.delete(address);
      };
    },
  };
}
