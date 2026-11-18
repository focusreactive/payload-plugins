import { toast } from "@payloadcms/ui";
import type { CollectionSlug } from "payload";

import type { ComponentProps } from "react";
import { useState } from "react";

import { CheckIcon } from "../../../../shared/lib/assets/icons/CheckIcon.js";
import { CloseIcon } from "../../../../shared/lib/assets/icons/CloseIcon.js";
import { ReloadIcon } from "../../../../shared/lib/assets/icons/ReloadIcon.js";
import { useCancelDocumentTranslation } from "../../api/mutations/useCancelDocumentTranslation.js";
import { useDismissStaleness } from "../../api/mutations/useDismissStaleness.js";
import { useRunDocumentTranslation } from "../../api/mutations/useRunDocumentTranslation.js";
import type { TranslationStatusRow } from "../../model/statusRows.js";
import { ActionButton } from "../ActionButton/index.js";

/** What a row offers a person, in the shape the button already takes. */
export type RowAction = ComponentProps<typeof ActionButton>;

type TranslatedDocument = {
  collection: CollectionSlug;
  id: string;
};

const withToast = async (run: () => Promise<unknown>, fallback: string) => {
  try {
    await run();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : fallback);
  }
};

/** The one place a row's state decides what may be done to it. */
export function useRowActions({
  collection,
  id,
}: TranslatedDocument): (row: TranslationStatusRow) => RowAction[] {
  const runApi = useRunDocumentTranslation();
  const cancelApi = useCancelDocumentTranslation();
  const dismissApi = useDismissStaleness();
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  const dismiss = async (targetLocale: string) => {
    setDismissing((prev) => new Set(prev).add(targetLocale));
    await withToast(
      () => dismissApi.mutateAsync({ collection, id, target_lng: targetLocale }),
      "Failed to dismiss out-of-date notice"
    );
    setDismissing((prev) => {
      const next = new Set(prev);
      next.delete(targetLocale);
      return next;
    });
  };

  const click = (act: () => Promise<unknown>, fallback: string) => () => {
    void withToast(act, fallback);
  };

  const runNow = () => runApi.mutateAsync({ collection, id });
  const cancelRun = () => cancelApi.mutateAsync({ collection, id });

  return (row) => {
    const cancel: RowAction = {
      icon: <CloseIcon />,
      title: "Cancel",
      onClick: click(cancelRun, "Error cancelling"),
      loading: cancelApi.isPending,
    };

    switch (row.state) {
      case "abandoned":
      case "failed":
        return [
          {
            icon: <ReloadIcon />,
            title: "Retry",
            onClick: click(runNow, "Error retrying"),
            loading: runApi.isPending,
          },
        ];
      case "running":
        return [cancel];
      case "pending":
        return [
          {
            icon: <ReloadIcon />,
            title: "Run now",
            onClick: click(runNow, "Error running"),
            loading: runApi.isPending,
          },
          cancel,
        ];
      case "stale":
        return [
          {
            icon: <CheckIcon />,
            title: "Hide this notice until the source changes again",
            onClick: () => void dismiss(row.targetLocale),
            disabled: dismissing.has(row.targetLocale),
            loading: dismissing.has(row.targetLocale),
          },
        ];
      default:
        return [];
    }
  };
}
