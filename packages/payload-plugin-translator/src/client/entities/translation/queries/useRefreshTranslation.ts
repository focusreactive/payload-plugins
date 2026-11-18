import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { translationKeys } from "./translationKeys.js";
import type { TranslationKey } from "./translationKeys.js";

export type RefreshTranslation = (scope?: TranslationKey) => Promise<void>;

/** Marks the translation reads under `scope` (every one by default) stale and refetches those on screen. */
export function useRefreshTranslation(): RefreshTranslation {
  const queryClient = useQueryClient();
  return useCallback(
    (scope = translationKeys.all) => queryClient.invalidateQueries({ queryKey: scope }),
    [queryClient]
  );
}
