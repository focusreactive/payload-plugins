import type { en } from "./messages/en";

/**
 * The `translations` plugin option: `{ [language]: { [key]: string } }`.
 *
 * Keys are the ones in `messages/en.ts`, with or without the `seo:` prefix
 * (`"tab.keyphrase"`, `"seo:tab.keyphrase"`). The colon-separated keys of
 * earlier versions (`"seo:tab:keyphrase"`) are still accepted.
 */
export type Translations = Record<string, Record<string, string>>;

export type MessageId = keyof typeof en;

export type PluralSuffix = "_zero" | "_one" | "_two" | "_few" | "_many" | "_other";

type PluralForm<K> = K extends `${string}${PluralSuffix}` ? K : never;
type PluralBase<K> = K extends `${infer B}_other` ? B : never;

/** A message looked up by its plural base and a `count` var (`"headings.errors"`). */
export type PluralKey = PluralBase<MessageId>;

/** Everything `t()` accepts. */
export type TranslationKey = Exclude<MessageId, PluralForm<MessageId>> | PluralKey;

/**
 * A complete set of strings for one language: every plain message, and every
 * plural with at least its `_other` form (the other forms a language needs —
 * `_one`, `_few`, … — are optional because languages differ in which exist).
 */
export type LanguageMessages = Record<Exclude<MessageId, PluralForm<MessageId>>, string> &
  Record<`${PluralKey}_other`, string> &
  Partial<Record<`${PluralKey}${PluralSuffix}`, string>>;

export type MessageVars = Record<string, string | number>;

/**
 * Text the engine produces, kept as a key so the UI renders it in the admin
 * language. The engine never builds sentences itself.
 */
export interface Message {
  key: TranslationKey;
  vars?: MessageVars;
}
