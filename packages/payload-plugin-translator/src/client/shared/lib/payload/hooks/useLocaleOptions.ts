import { useConfig, useTranslation } from "@payloadcms/ui";
import { useMemo } from "react";

type LocaleLabel = string | Record<string, string> | undefined;

/** The locale's name in the admin language ("English"), falling back to its code. */
const labelOf = (label: LocaleLabel, code: string, language: string): string => {
  if (typeof label === "string" && label) return label;
  if (label && typeof label === "object") return label[language] ?? Object.values(label)[0] ?? code;
  return code;
};

export function useLocaleOptions(): Array<{ value: string; label: string }> {
  const appConfig = useConfig();
  const { i18n } = useTranslation();

  return useMemo(
    () =>
      appConfig.config.localization
        ? appConfig.config.localization.locales.map((l) => ({
            value: l.code,
            label: labelOf(l.label as LocaleLabel, l.code, i18n.language),
          }))
        : [],
    [appConfig.config.localization, i18n.language]
  );
}
