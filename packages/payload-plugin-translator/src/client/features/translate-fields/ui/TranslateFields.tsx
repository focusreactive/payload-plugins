"use client";

import { useMemo, useState } from "react";

import type { LeafVerdict, TreeNode } from "../../../../types/wire/DocumentTranslationState.js";
import type { LeafAddress, LocaleCode } from "../../../../types/wire/primitives.js";
import type { DocumentAddress, TranslationScope } from "../../../entities/translation/index.js";
import {
  allAddresses,
  documentEnqueue,
  FieldTree,
  filterTree,
  initialSelection,
  selectedInTreeOrder,
  toggleNode,
  TranslationsApi,
} from "../../../entities/translation/index.js";
import { useTranslateKitConfig } from "../../../shared/config/index.js";
import { useActionError } from "../../../shared/lib/utils/react/useActionError.js";
import Button from "../../../shared/ui/Button/index.js";
import InfoPopover from "../../../shared/ui/InfoPopover/index.js";

import styles from "./styles.module.scss";

type Common = {
  document: DocumentAddress;
  source: LocaleCode;
  locale: LocaleCode;
  localeLabel: string;
  sourceLabel: string;
  tree: readonly TreeNode[];
  excluded: readonly string[];
  /** True while the document has a live run. */
  startBlocked: boolean;
};

type PickingFields = Common & {
  mode: "pick";
  verdicts: Readonly<Record<LeafAddress, LeafVerdict>>;
  /** Leaves Payload refuses to leave empty: always part of the run. */
  mustInclude: readonly LeafAddress[];
};

type WholeDocumentFields = Common & { mode: "whole" };

export type TranslateFieldsProps = PickingFields | WholeDocumentFields;

const REQUIRED_REASON =
  "Payload will not save a locale with its required fields left empty, so a first translation cannot be partial.";

function useTranslate({ document, source, locale }: Common) {
  const queue = TranslationsApi.useQueueDocumentTranslation();
  const { error, run } = useActionError();
  const translate = (scope: TranslationScope) =>
    run(() => queue.mutateAsync(documentEnqueue({ document, source, targets: [locale], scope })));
  return { translate, error, pending: queue.isPending };
}

function ErrorLine({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p role="alert" className={styles.error}>
      {error.message}
    </p>
  );
}

function PickFields(props: PickingFields) {
  const { abilities } = useTranslateKitConfig();
  const { translate, error, pending } = useTranslate(props);
  const locked = useMemo(() => new Set(props.mustInclude), [props.mustInclude]);
  const [selection, setSelection] = useState(() =>
    initialSelection(props.tree, props.verdicts, props.mustInclude)
  );
  const [query, setQuery] = useState("");

  const picked = selectedInTreeOrder(props.tree, selection);
  const total = allAddresses(props.tree).length;

  return (
    <div className={styles.fields}>
      <input
        type="text"
        className={styles.filter}
        placeholder="Filter fields"
        aria-label={`Filter ${props.localeLabel} fields`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <FieldTree
        mode="pick"
        tree={filterTree(props.tree, query)}
        excluded={props.excluded}
        localeLabel={props.localeLabel}
        sourceLabel={props.sourceLabel}
        selection={selection}
        locked={locked}
        disabled={props.startBlocked}
        onToggle={(node) => setSelection((current) => toggleNode(node, current, locked))}
      />
      <div className={styles.footer}>
        <span className={styles.count}>
          {picked.length} of {total} fields
        </span>
        {abilities.translate && (
          <Button
            type="button"
            $variant="filled"
            aria-label={`Translate ${picked.length} fields into ${props.localeLabel}`}
            disabled={props.startBlocked || pending || picked.length === 0}
            onClick={() => translate({ kind: "leaves", addresses: picked })}
          >
            Translate · {picked.length}
          </Button>
        )}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

function WholeDocument(props: WholeDocumentFields) {
  const { abilities } = useTranslateKitConfig();
  const { translate, error, pending } = useTranslate(props);
  const total = allAddresses(props.tree).length;

  return (
    <div className={styles.fields}>
      <p className={styles.whole}>
        The whole document, {total} fields
        <InfoPopover label={REQUIRED_REASON} content={REQUIRED_REASON} />
      </p>
      <FieldTree
        mode="whole"
        tree={props.tree}
        excluded={props.excluded}
        localeLabel={props.localeLabel}
        sourceLabel={props.sourceLabel}
      />
      {abilities.translate && (
        <div className={styles.footer}>
          <span className={styles.count} />
          <Button
            type="button"
            $variant="filled"
            aria-label={`Translate all ${total} fields into ${props.localeLabel}`}
            disabled={props.startBlocked || pending}
            onClick={() => translate({ kind: "whole" })}
          >
            Translate all {total}
          </Button>
        </div>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/** One locale's fields: pick some for a partial run, or see what a whole first run takes. */
export function TranslateFields(props: TranslateFieldsProps) {
  return props.mode === "pick" ? <PickFields {...props} /> : <WholeDocument {...props} />;
}
