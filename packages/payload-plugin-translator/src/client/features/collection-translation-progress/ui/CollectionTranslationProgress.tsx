"use client";

import { ShimmerEffect } from "@payloadcms/ui";
import { TrashIcon } from "@payloadcms/ui/icons/Trash";

import type {
  CollectionTranslationPanel,
  ReportedStatus,
} from "../../../entities/translation/index.js";
import {
  ActionButton,
  DocumentTranslationStatus,
  TranslationsApi,
} from "../../../entities/translation/index.js";
import ColorIndicator from "../../../shared/ui/ColorIndicator/index.js";

import styles from "./styles.module.scss";

type CollectionTranslationProgressProps = {
  collection: string;
  data: CollectionTranslationPanel | undefined;
  isPending: boolean;
  canStop: boolean;
};

const ROWS: Array<{
  key: ReportedStatus;
  label: string;
  color: "blue" | "gray" | "green" | "red";
}> = [
  { key: DocumentTranslationStatus.RUNNING, label: "Translating", color: "blue" },
  { key: DocumentTranslationStatus.PENDING, label: "Queued", color: "gray" },
  { key: DocumentTranslationStatus.FAILED, label: "Failed", color: "red" },
];

const UNITS = [
  { ms: 24 * 60 * 60 * 1000, one: "day", many: "days" },
  { ms: 60 * 60 * 1000, one: "hour", many: "hours" },
  { ms: 60 * 1000, one: "minute", many: "minutes" },
] as const;

/** Spelled in the units it divides into — "1 day 12 hours" rather than "36 hours". */
const spanOf = (ms: number): string => {
  const said: string[] = [];
  let left = ms;
  for (const unit of UNITS) {
    const count = Math.floor(left / unit.ms);
    if (count > 0) said.push(`${count} ${count === 1 ? unit.one : unit.many}`);
    left -= count * unit.ms;
  }
  return said.length > 0 ? said.join(" ") : "under a minute";
};

/** What the collection is doing now, one row per non-zero count. */
export function CollectionTranslationProgress({
  collection,
  data,
  isPending,
  canStop,
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
        const count = data.counts[key];
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
                {canStop && key === DocumentTranslationStatus.PENDING && (
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
              <p className={styles.meta}>
                Last {spanOf(data.failedWindowMs)} — open a document to see why
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
