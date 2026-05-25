"use client";

import { useTranslation } from "@payloadcms/ui";
import { formatRelativeDate } from "../utils/general/formatRelativeDate";

export function useRelativeDate(iso: string) {
  const { i18n } = useTranslation();

  return formatRelativeDate(iso, i18n.language);
}
