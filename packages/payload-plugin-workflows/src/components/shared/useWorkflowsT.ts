"use client";

import { useTranslation } from "@payloadcms/ui";
import { useCallback } from "react";

import { NAMESPACE } from "../../translations/merge.js";
import type { T } from "./format.js";

/** `t` for the plugin's own strings, plus the admin language for dates. */
export const useWorkflowsT = (): { t: T; language: string } => {
  const { t: translate, i18n } = useTranslation();
  const t = useCallback<T>(
    (key, vars) => translate(`${NAMESPACE}:${key}` as never, vars as never),
    [translate]
  );
  return { t, language: i18n.language };
};
