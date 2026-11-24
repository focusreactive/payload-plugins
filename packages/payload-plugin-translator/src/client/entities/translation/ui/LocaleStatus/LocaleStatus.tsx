"use client";

import type { IsoDateTime, LocaleCode } from "../../../../../types/wire/primitives.js";
import { clockTime } from "../../../../shared/lib/time/clockTime.js";
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

const NO_NEWS_AFTER_MS = 5 * 60 * 1000;

const hasGoneQuiet = (queuedAt: IsoDateTime, now: Date): boolean =>
  now.getTime() - new Date(queuedAt).getTime() >= NO_NEWS_AFTER_MS;

const NoNews = ({ since }: { since: IsoDateTime }) => (
  <span className={`${styles.status} ${styles.warning}`}>
    <ColorIndicator $color="amber" />
    No news since {clockTime(since)}
  </span>
);

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
    case "translating": {
      /*
       * The process that would close this record is the one that may have died, so nothing here
       * can tell a slow translation from a dead one. Past the window the panel stops claiming
       * work and leaves the editor the cancel beside it.
       */
      if (hasGoneQuiet(row.queuedAt, now)) return <NoNews since={row.queuedAt} />;
      return (
        <span className={styles.status}>
          <ColorIndicator $color="blue" $animated />
          Translating <span className={styles.when}>queued {timeAgo(row.queuedAt, now)}</span>
        </span>
      );
    }
    case "queued": {
      if (hasGoneQuiet(row.queuedAt, now)) return <NoNews since={row.queuedAt} />;
      return (
        <span className={styles.status}>
          <ColorIndicator $color="gray" />
          Queued
        </span>
      );
    }
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
