import type { BlockLike } from "../../../core/kernel/field-traversal/index.js";
import type { LanguageTable } from "../../../traversal/index.js";
import {
  PAYLOAD_FIELDS_ID,
  payloadFieldsLanguage,
  payloadLexicalContent,
  payloadLexicalLanguage,
} from "../../../languages/index.js";

export function translationLanguages(embeds: readonly BlockLike[] = []): LanguageTable {
  return {
    languages: [
      payloadFieldsLanguage({ crossings: [payloadLexicalContent()], blocks: embeds }),
      payloadLexicalLanguage(),
    ],
    hostLanguageId: PAYLOAD_FIELDS_ID,
  };
}
