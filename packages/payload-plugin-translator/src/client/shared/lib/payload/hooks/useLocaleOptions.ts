import { useConfig } from "@payloadcms/ui";
import { useMemo } from "react";

export function useLocaleOptions(): { value: string; label: string }[] {
  const appConfig = useConfig();

  return useMemo(
    () =>
      appConfig.config.localization
        ? appConfig.config.localization.locales.map((l) => ({
            label: l.code,
            value: l.code,
          }))
        : [],
    [appConfig.config.localization]
  );
}
