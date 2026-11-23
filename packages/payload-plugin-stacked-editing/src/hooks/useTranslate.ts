"use client";

import { useTranslation } from "@payloadcms/ui";
import { useMemo } from "react";

import { createTranslate } from "../lib/labels.js";
import type { Translate } from "../lib/labels.js";

export const useTranslate = (): Translate => {
  const { i18n, t } = useTranslation();
  return useMemo(
    () =>
      createTranslate({
        fallbackLanguage: i18n.fallbackLanguage,
        language: i18n.language,
        t: t as (key: string) => string,
      }),
    [i18n.fallbackLanguage, i18n.language, t]
  );
};
