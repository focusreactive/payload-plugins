"use client";

import { useState } from "react";

import type { ListTranslationState } from "../../../../types/wire/ListTranslationState.js";
import type { DocumentId, LocaleCode } from "../../../../types/wire/primitives.js";
import type { LocaleChoice } from "../../../entities/translation/index.js";
import {
  batchOf,
  batchSummary,
  collectionEnqueue,
  liveDocumentsOf,
  TranslationsApi,
} from "../../../entities/translation/index.js";
import { useTranslateKitConfig } from "../../../shared/config/index.js";
import { CloseIcon } from "../../../shared/lib/assets/icons/CloseIcon.js";
import type { ListRow } from "../../../shared/lib/payload/hooks/useListView.js";
import { useActionError } from "../../../shared/lib/utils/react/useActionError.js";
import Button from "../../../shared/ui/Button/index.js";
import { Checkbox } from "../../../shared/ui/Checkbox/index.js";
import InfoPopover from "../../../shared/ui/InfoPopover/index.js";
import Select from "../../../shared/ui/Select/index.js";

import styles from "./styles.module.scss";

type CollectionPanelProps = {
  headingId: string;
  collection: string;
  locales: readonly LocaleChoice[];
  defaultLocale: LocaleCode | undefined;
  /** The documents to translate; unknown while the view's ids are still being read. */
  documents: readonly DocumentId[] | undefined;
  /** The rows to list by title; empty when the documents are the whole view. */
  rows: readonly ListRow[];
  list: ListTranslationState | undefined;
  onDone: () => void;
  onClose: () => void;
};

const BEHIND_HINT =
  "Fields whose source changed since their last translation. A locale with nothing in it yet is translated whole.";

const toggled = <Item,>(set: ReadonlySet<Item>, item: Item): Set<Item> => {
  const next = new Set(set);
  if (next.has(item)) next.delete(item);
  else next.add(item);
  return next;
};

/** The drawer for many documents: the source, the target locales, the documents, then Translate. */
export function CollectionPanel({
  headingId,
  collection,
  locales,
  defaultLocale,
  documents,
  rows,
  list,
  onDone,
  onClose,
}: CollectionPanelProps) {
  const { abilities } = useTranslateKitConfig();
  const queue = TranslationsApi.useQueueDocumentTranslation();
  const { error, run } = useActionError();

  const [source, setSource] = useState<LocaleCode>(defaultLocale ?? locales[0]?.code ?? "");
  const [unticked, setUnticked] = useState<ReadonlySet<LocaleCode>>(new Set());
  const [removed, setRemoved] = useState<ReadonlySet<DocumentId>>(new Set());
  const [onlyBehind, setOnlyBehind] = useState(false);

  const live = liveDocumentsOf(list);
  const batch = batchOf(documents ?? [], removed, live);
  const kept = batch.queue.length + batch.skipped.length;
  const skipped = new Set(batch.skipped);
  const candidates = locales.filter(({ code }) => code !== source);
  const targets = candidates.map(({ code }) => code).filter((code) => !unticked.has(code));
  const body = collectionEnqueue({
    collection,
    source,
    targets,
    documents: batch.queue,
    onlyBehind: abilities.staleness && onlyBehind,
  });

  const translate = () => {
    if (!body) return;
    run(async () => {
      await queue.mutateAsync(body);
      onDone();
    });
  };

  return (
    <>
      <header className={styles.head}>
        <h2 id={headingId} className={styles.heading}>
          {documents ? `Translate ${kept} ${kept === 1 ? "document" : "documents"}` : "Translate"}
        </h2>
        <label htmlFor={`${headingId}-from`} className={styles.from}>
          From
        </label>
        <Select
          id={`${headingId}-from`}
          $size="md"
          $fullWidth={false}
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          {locales.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </Select>
        <button type="button" className={styles.close} aria-label="Close panel" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>

      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.eyebrow}>Into</h3>
          <div className={styles.picks}>
            {candidates.map(({ code, label }) => (
              <label key={code} className={styles.pick}>
                <Checkbox
                  checked={!unticked.has(code)}
                  onChange={() => setUnticked((current) => toggled(current, code))}
                />
                {label}
              </label>
            ))}
          </div>
          {abilities.staleness && (
            <div className={styles.option}>
              <label className={styles.pick}>
                <Checkbox
                  checked={onlyBehind}
                  onChange={(event) => setOnlyBehind(event.target.checked)}
                />
                Only what is behind the source
              </label>
              <InfoPopover label={BEHIND_HINT} content={BEHIND_HINT} />
            </div>
          )}
        </section>

        <section className={styles.section}>
          {rows.length > 0 ? (
            <>
              <h3 className={styles.eyebrow}>Selected in the list</h3>
              <ul className={styles.documents}>
                {rows
                  .filter(({ id }) => (documents ?? []).includes(id) && !removed.has(id))
                  .map(({ id, title }) => (
                    <li key={id} className={styles.document}>
                      <span className={styles.title}>{title}</span>
                      {skipped.has(id) && (
                        <span className={styles.skipped}>queued or translating — skipped</span>
                      )}
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`Remove ${title} from the selection`}
                        onClick={() => setRemoved((current) => toggled(current, id))}
                      >
                        <CloseIcon />
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          ) : (
            <p className={styles.text}>
              {documents
                ? `All ${documents.length} documents this view shows — the current search and filters.`
                : "Counting the documents this view shows…"}
            </p>
          )}
        </section>
      </div>

      <footer className={styles.foot}>
        <span className={styles.summary}>
          {batchSummary(batch.queue.length, targets.length)}
          {batch.skipped.length > 0 && " A document already queued or translating is skipped."}{" "}
          Saved as drafts.
        </span>
        {error && (
          <p role="alert" className={styles.error}>
            {error.message}
          </p>
        )}
        <div className={styles.actions}>
          <Button type="button" $variant="outlined" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            $variant="filled"
            disabled={!body || queue.isPending}
            onClick={translate}
          >
            Translate
          </Button>
        </div>
      </footer>
    </>
  );
}
