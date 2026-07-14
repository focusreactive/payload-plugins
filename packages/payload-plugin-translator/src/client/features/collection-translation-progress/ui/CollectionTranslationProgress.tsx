"use client";

import { ShimmerEffect } from "@payloadcms/ui";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";

import type { GroupedCollectionTranslationStatus } from "../../../entities/translation";
import {
  ActionButton,
  DocumentTranslationStatus,
  TranslationsApi,
} from "../../../entities/translation";
import ColorIndicator from "../../../shared/ui/ColorIndicator";

import styles from "./styles.module.scss";

type CollectionTranslationProgressProps = {
  collection: string;
  data: GroupedCollectionTranslationStatus | undefined;
  isPending: boolean;
};

// Same colour + label vocabulary as the document status list (StatusBadge STATE_LABEL). Only the
// actively-processing group pulses — Queued is waiting, not working, so it stays static.
const ROWS: Array<{
  key: DocumentTranslationStatus;
  label: string;
  color: "blue" | "gray" | "green" | "red";
}> = [
  { key: DocumentTranslationStatus.RUNNING, label: "Translating", color: "blue" },
  { key: DocumentTranslationStatus.PENDING, label: "Queued", color: "gray" },
  { key: DocumentTranslationStatus.COMPLETED, label: "Translated", color: "green" },
  { key: DocumentTranslationStatus.FAILED, label: "Failed", color: "red" },
];

/**
 * Collection status as a compact list of grouped counts — one `[dot] label … count` row per
 * non-zero group, mirroring the document popup's per-locale list rhythm (dot vocabulary shared).
 */
export function CollectionTranslationProgress({
  collection,
  data,
  isPending,
}: CollectionTranslationProgressProps) {
  const cancelPendingTranslations = TranslationsApi.useCancelCollectionTranslations();

  if (isPending) {
    return (
      <div className={styles["status-list"]}>
        <ShimmerEffect width="100%" height={20} />
        <ShimmerEffect width="100%" height={20} />
        <ShimmerEffect width="100%" height={20} />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <ul className={styles["status-list"]}>
      {ROWS.map(({ key, label, color }) => {
        const count = data[key].length;
        if (count === 0) {
          return null;
        }

        return (
          <li key={key} className={styles["status-row"]}>
            <div className={styles.top}>
              <span className={styles.lead}>
                <ColorIndicator
                  $color={color}
                  $animated={key === DocumentTranslationStatus.RUNNING}
                />
                <span className={styles.label}>{label}</span>
              </span>
              <span className={styles.right}>
                <span className={styles.count}>{count}</span>
                {key === DocumentTranslationStatus.PENDING && (
                  <ActionButton
                    icon={<TrashIcon />}
                    title="Cancel translations"
                    onClick={() => cancelPendingTranslations.mutateAsync({ collection })}
                    disabled={cancelPendingTranslations.isPending}
                    loading={cancelPendingTranslations.isPending}
                  />
                )}
              </span>
            </div>
            {/* No per-doc error data in the grouped status API — point the user to where detail lives. */}
            {key === DocumentTranslationStatus.FAILED && (
              <p className={styles.meta}>Open a document to see why</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
