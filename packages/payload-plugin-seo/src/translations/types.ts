import type { en } from "./messages/en";

export type MessageId = keyof typeof en;

export type PluralSuffix = "_zero" | "_one" | "_two" | "_few" | "_many" | "_other";

type PluralForm<K> = K extends `${string}${PluralSuffix}` ? K : never;
type PluralBase<K> = K extends `${infer B}_other` ? B : never;

/** A message looked up by its plural base and a `count` var (`"headings.errors"`). */
export type PluralKey = PluralBase<MessageId>;

/** Everything `t()` accepts. */
export type TranslationKey = Exclude<MessageId, PluralForm<MessageId>> | PluralKey;

/** Every key a set of strings may define: plain messages and each plural form. */
export type MessageKey = Exclude<MessageId, PluralForm<MessageId>> | `${PluralKey}${PluralSuffix}`;

/**
 * Strings for one language. Any key it leaves out, and any plural without its
 * `_other` form, falls back to English.
 */
export type LanguageMessages = Partial<Record<MessageKey, string>>;

type LegacyKey =
  | "seo:tab:keyphrase"
  | "seo:tab:onpage"
  | "seo:tab:readability"
  | "seo:tab:inclusive"
  | "seo:tab:vitals"
  | "seo:tab:serp";

/**
 * The `translations` plugin option: `{ [language]: { [key]: string } }`.
 *
 * Keys are the ones in `messages/en.ts`, with or without the `seo:` prefix
 * (`"tab.keyphrase"`, `"seo:tab.keyphrase"`). The colon-separated tab keys of
 * earlier versions (`"seo:tab:keyphrase"`) are still accepted.
 */
export type Translations = Record<
  string,
  Partial<Record<MessageKey | `seo:${MessageKey}` | LegacyKey, string>>
>;

export type MessageVars = Record<string, string | number>;

/**
 * Text the engine produces, kept as a key so the UI renders it in the admin
 * language. The engine never builds sentences itself.
 */
export interface Message {
  key: TranslationKey;
  vars?: MessageVars;
}
