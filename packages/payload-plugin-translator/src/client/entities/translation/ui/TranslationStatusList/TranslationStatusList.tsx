import type { CollectionSlug } from "payload";

import type { TranslationStatusRow } from "../../model/statusRows.js";
import { ActionButton } from "../ActionButton/index.js";
import { TranslationDirection } from "../TranslationDirection/index.js";

import { STATE_LABEL, StatusBadge } from "./StatusBadge.js";
import { useRowActions } from "./rowActions.js";
import styles from "./styles.module.scss";

type TranslationStatusListProps = {
  rows: TranslationStatusRow[];
  collection: CollectionSlug;
  id: string;
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const fullDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * The unified per-locale status list: one consistent row per target locale
 * (`[badge] [en→fr] [when] [action]`). Replaces the old corner chip, the "out of date" column, and
 * the separate running/pending/failed chips.
 */
export function TranslationStatusList({ rows, collection, id }: TranslationStatusListProps) {
  const actionsFor = useRowActions({ collection, id });

  return (
    <ul className={styles.list}>
      {rows.map((row) => {
        const actions = actionsFor(row);
        return (
          <li
            key={row.targetLocale}
            className={styles.row}
            aria-label={
              `${STATE_LABEL[row.state]}: ${row.sourceLocale} to ${row.targetLocale}` +
              (row.error ? ` — ${row.error}` : "")
            }
          >
            <div className={styles.top}>
              <div className={styles.lead}>
                <StatusBadge state={row.state} />
                <TranslationDirection
                  sourceLocale={row.sourceLocale}
                  targetLocale={row.targetLocale}
                />
              </div>
              {actions.length > 0 && (
                <span className={styles.actions}>
                  {actions.map((action) => (
                    <ActionButton key={action.title} {...action} />
                  ))}
                </span>
              )}
            </div>
            <div className={styles.meta}>
              <span>{STATE_LABEL[row.state]}</span>
              {row.at && (
                <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={row.at} title={fullDate(row.at)}>
                    {shortDate(row.at)}
                  </time>
                </>
              )}
            </div>
            {row.state === "failed" && row.error && (
              <p className={styles.error} title={row.error}>
                {row.error}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
