"use client";

import type { LocaleCode } from "../../../../../types/wire/primitives.js";
import { timeAgo } from "../../../../shared/lib/time/timeAgo.js";
import ColorIndicator from "../../../../shared/ui/ColorIndicator/index.js";
import InfoPopover from "../../../../shared/ui/InfoPopover/index.js";
import type { LocaleRow } from "../../model/localeRow.js";

import styles from "./styles.module.scss";

type LocaleStatusProps = {
  row: LocaleRow;
  labelOf: (locale: LocaleCode) => string;
  now: Date;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export const WRITTEN_BY_HAND_WARNING = "Text with no record of a run. Translating replaces it.";

/** What a target locale holds, in the panel's words. */
export function LocaleStatus({ row, labelOf, now }: LocaleStatusProps) {
  switch (row.kind) {
    case "up-to-date":
      return (
        <span className={styles.status}>
          Up to date <span className={styles.when}>{timeAgo(row.translatedAt, now)}</span>
        </span>
      );
    case "behind":
      return (
        <span className={`${styles.status} ${styles.warning}`}>
          {row.behind > 0 && (
            <span className={styles.part}>
              <ColorIndicator $color="amber" />
              {plural(row.behind, "field behind", "fields behind")}
            </span>
          )}
          {row.cameBackEmpty > 0 && (
            <span className={styles.part}>
              <span className={styles.bang} aria-hidden="true">
                !
              </span>
              {row.cameBackEmpty} came back empty
            </span>
          )}
        </span>
      );
    case "not-translated":
      return <span className={styles.status}>Not translated</span>;
    case "written-by-hand":
      return (
        <span className={styles.status}>
          Written by hand
          <InfoPopover label={WRITTEN_BY_HAND_WARNING} content={WRITTEN_BY_HAND_WARNING} />
        </span>
      );
    case "translated":
      return <span className={styles.status}>Translated</span>;
    case "translating":
      return (
        <span className={styles.status}>
          <ColorIndicator $color="blue" $animated />
          Translating <span className={styles.when}>started {timeAgo(row.startedAt, now)}</span>
        </span>
      );
    case "queued":
      return (
        <span className={styles.status}>
          <ColorIndicator $color="gray" />
          Queued
        </span>
      );
    case "failed":
      return (
        <span className={`${styles.status} ${styles.error}`}>
          <ColorIndicator $color="red" />
          Failed — {row.message}
        </span>
      );
    case "not-started":
      return (
        <span className={styles.status}>
          Not started — {labelOf(row.failedLocale)} failed first
        </span>
      );
  }
}
