import { en } from "./messages/en";
import type { MessageVars, TranslationKey } from "./types";

export const TRANSLATION_NAMESPACE = "seo";

export type Messages = Readonly<Record<string, string>>;

export type Translate = (key: TranslationKey, vars?: MessageVars) => string;

function pluralRules(language: string): Intl.PluralRules {
  try {
    return new Intl.PluralRules(language);
  } catch {
    return new Intl.PluralRules("en");
  }
}

function interpolate(template: string, vars: MessageVars | undefined): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/gu, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

function pluralFrom(
  messages: Messages | undefined,
  rules: Intl.PluralRules,
  key: string,
  count: number
): string | undefined {
  if (!messages?.[`${key}_other`]) return undefined;
  if (count === 0 && messages[`${key}_zero`]) return messages[`${key}_zero`];
  return messages[`${key}_${rules.select(count)}`] ?? messages[`${key}_other`];
}

export function createTranslator(
  language: string,
  messages: Messages | undefined,
  fallback: Messages = en
): Translate {
  const rules = pluralRules(language);
  const fallbackRules = pluralRules("en");

  return (key, vars) => {
    const count = vars?.count;
    const template =
      (typeof count === "number"
        ? (pluralFrom(messages, rules, key, count) ??
          pluralFrom(fallback, fallbackRules, key, count))
        : undefined) ??
      messages?.[key] ??
      fallback[key] ??
      key;

    return interpolate(template, vars);
  };
}

export function normalizeMessageKey(key: string): string {
  const unprefixed = key.startsWith(`${TRANSLATION_NAMESPACE}:`)
    ? key.slice(TRANSLATION_NAMESPACE.length + 1)
    : key;
  return unprefixed.replaceAll(":", ".");
}
