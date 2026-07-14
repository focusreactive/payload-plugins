import { toast } from "@payloadcms/ui";
import type { CollectionSlug } from "payload";

import { useState } from "react";

import { CheckIcon } from "../../../../shared/lib/assets/icons/CheckIcon";
import { CloseIcon } from "../../../../shared/lib/assets/icons/CloseIcon";
import { ReloadIcon } from "../../../../shared/lib/assets/icons/ReloadIcon";
import { useCancelDocumentTranslation } from "../../api/mutations/useCancelDocumentTranslation";
import { useDismissStaleness } from "../../api/mutations/useDismissStaleness";
import { useQueueDocumentTranslation } from "../../api/mutations/useQueueDocumentTranslation";
import { useRunDocumentTranslation } from "../../api/mutations/useRunDocumentTranslation";
import type { TranslationStatusRow } from "../../model/statusRows";
import { ActionButton } from "../ActionButton";
import { TranslationDirection } from "../TranslationDirection";

import { STATE_LABEL, StatusBadge } from "./StatusBadge";
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

const withToast = async (run: () => Promise<unknown>, fallback: string) => {
  try {
    await run();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : fallback);
  }
};

/**
 * The unified per-locale status list: one consistent row per target locale
 * (`[badge] [en→fr] [when] [action]`). Replaces the old corner chip, the "out of date" column, and
 * the separate running/pending/failed chips. Row actions reuse the existing mutation hooks.
 */
export function TranslationStatusList({ rows, collection, id }: TranslationStatusListProps) {
  const runApi = useRunDocumentTranslation();
  const cancelApi = useCancelDocumentTranslation();
  const dismissApi = useDismissStaleness();
  const queueApi = useQueueDocumentTranslation();
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

  // Re-translate one locale in place: a fresh source→target job (overwrite). Reuses the same queue
  // endpoint as the form; onSuccess invalidation refreshes this list.
  const reTranslate = (row: TranslationStatusRow) =>
    withToast(
      () =>
        queueApi.mutateAsync({
          source_lng: row.sourceLocale,
          target_lng: row.targetLocale,
          collection_slug: collection,
          collection_id: [id],
          strategy: "overwrite",
        }),
      "Failed to queue translation"
    );

  const retry = (row: TranslationStatusRow) =>
    row.jobId && withToast(() => runApi.mutateAsync({ id: row.jobId! }), "Error retrying");
  const runNow = (row: TranslationStatusRow) =>
    row.jobId && withToast(() => runApi.mutateAsync({ id: row.jobId! }), "Error running");
  const cancel = (row: TranslationStatusRow) =>
    row.jobId && withToast(() => cancelApi.mutateAsync({ id: row.jobId! }), "Error cancelling");

  const renderAction = (row: TranslationStatusRow) => {
    switch (row.state) {
      case "failed":
        return (
          <span className={styles.actions}>
            <ActionButton
              icon={<ReloadIcon />}
              title="Retry"
              onClick={() => retry(row)}
              loading={runApi.isPending}
            />
          </span>
        );
      case "running":
        return (
          <span className={styles.actions}>
            <ActionButton
              icon={<CloseIcon />}
              title="Cancel"
              onClick={() => cancel(row)}
              loading={cancelApi.isPending}
            />
          </span>
        );
      case "pending":
        return (
          <span className={styles.actions}>
            <ActionButton
              icon={<ReloadIcon />}
              title="Run now"
              onClick={() => runNow(row)}
              loading={runApi.isPending}
            />
            <ActionButton
              icon={<CloseIcon />}
              title="Cancel"
              onClick={() => cancel(row)}
              loading={cancelApi.isPending}
            />
          </span>
        );
      case "stale":
        return (
          <span className={styles.actions}>
            <ActionButton
              icon={<ReloadIcon />}
              title={`Re-translate from ${row.sourceLocale}`}
              onClick={() => reTranslate(row)}
              loading={queueApi.isPending}
            />
            <ActionButton
              icon={<CheckIcon />}
              title="Keep as is — hide until the source changes again"
              onClick={() => dismiss(row.targetLocale)}
              disabled={dismissing.has(row.targetLocale)}
              loading={dismissing.has(row.targetLocale)}
            />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <ul className={styles.list}>
      {rows.map((row) => (
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
            {renderAction(row)}
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
      ))}
    </ul>
  );
}
