"use client";

import { useTranslation } from "@payloadcms/ui";
import { useMemo } from "react";
import { createTranslator, TRANSLATION_NAMESPACE } from "./translate";
import type { Messages, Translate } from "./translate";

export function useSeoTranslation(): { t: Translate; language: string } {
  const { i18n } = useTranslation();
  const language = i18n?.language ?? "en";
  const messages = (i18n?.translations as Record<string, unknown> | undefined)?.[
    TRANSLATION_NAMESPACE
  ] as Messages | undefined;

  const t = useMemo(() => createTranslator(language, messages), [language, messages]);

  return { t, language };
}
