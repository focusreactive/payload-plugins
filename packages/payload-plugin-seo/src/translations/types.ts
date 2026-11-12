import type { en } from "./messages/en";

export type MessageId = keyof typeof en;

export type PluralSuffix = "_zero" | "_one" | "_two" | "_few" | "_many" | "_other";

type PluralForm<K> = K extends `${string}${PluralSuffix}` ? K : never;
type PluralBase<K> = K extends `${infer B}_other` ? B : never;

export type PluralKey = PluralBase<MessageId>;

export type TranslationKey = Exclude<MessageId, PluralForm<MessageId>> | PluralKey;

export type MessageKey = Exclude<MessageId, PluralForm<MessageId>> | `${PluralKey}${PluralSuffix}`;

export type LanguageMessages = Partial<Record<MessageKey, string>>;

type LegacyColonTabKey =
  | "seo:tab:keyphrase"
  | "seo:tab:onpage"
  | "seo:tab:readability"
  | "seo:tab:inclusive"
  | "seo:tab:vitals"
  | "seo:tab:serp";

export type Translations = Record<
  string,
  Partial<Record<MessageKey | `seo:${MessageKey}` | LegacyColonTabKey, string>>
>;

export type MessageVars = Record<string, string | number>;

export interface Message {
  key: TranslationKey;
  vars?: MessageVars;
}
