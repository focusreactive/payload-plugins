import { en } from "../../translations/en";
import type { Translations } from "../../translations/types";

export function mergeTranslations(
  incomingConfigTranslations: Record<string, object>,
  userTranslations: Translations
) {
  const mergedTranslations: Record<string, object> = {
    ...incomingConfigTranslations,
    en: {
      ...((incomingConfigTranslations?.en as Record<string, object>) ?? {}),
      comments: {
        ...en.comments,
        ...userTranslations.en,
      },
    },
  };

  const existingTranslations = incomingConfigTranslations as
    | Record<string, object>
    | undefined;

  for (const [locale, localeTranslations] of Object.entries(userTranslations)) {
    if (locale === "en") {continue;}

    mergedTranslations[locale] = {
      ...existingTranslations?.[locale],
      comments: {
        ...en.comments,
        ...localeTranslations,
      },
    };
  }

  return mergedTranslations;
}
