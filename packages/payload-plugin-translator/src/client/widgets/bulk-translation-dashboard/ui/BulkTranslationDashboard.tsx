"use client";

import { useSelection } from "@payloadcms/ui";
import { SelectAllStatus } from "@payloadcms/ui/providers/Selection";
import { useId, useMemo, useState } from "react";

import type { LocaleCode } from "../../../../types/wire/primitives.js";
import type { LocaleChoice } from "../../../entities/translation/index.js";
import { TranslationsApi, useListTranslationState } from "../../../entities/translation/index.js";
import { useTranslateKitConfig } from "../../../shared/config/index.js";
import { useListView } from "../../../shared/lib/payload/hooks/useListView.js";
import { useActionError } from "../../../shared/lib/utils/react/useActionError.js";
import Button from "../../../shared/ui/Button/index.js";
import SideDrawer from "../../../shared/ui/SideDrawer/index.js";
import { CollectionPanel } from "./CollectionPanel.js";
import { NothingSelected } from "./NothingSelected.js";
import { useViewIds } from "./useViewIds.js";

import styles from "./styles.module.scss";

type BulkTranslationDashboardProps = {
  collection: string;
  /** The host's locales, source and targets alike. */
  locales: readonly LocaleChoice[];
  defaultLocale: LocaleCode | undefined;
};

/** `view`: every document the list's search and filters match, not only the ticked rows. */
type Stage = "closed" | "nothing-selected" | "selection" | "view";

function CancelQueued({ collection }: { collection: string }) {
  const cancel = TranslationsApi.useCancelCollectionTranslations();
  const { error, run } = useActionError();
  return (
    <>
      {error && (
        <span role="alert" className={styles.error}>
          {error.message}
        </span>
      )}
      <Button
        type="button"
        $variant="outlined-light"
        disabled={cancel.isPending}
        onClick={() => run(() => cancel.mutateAsync({ collection }))}
      >
        Cancel queued
      </Button>
    </>
  );
}

/** Above the list: Translate the ticked rows (or what the view shows), and Cancel queued. */
export default function BulkTranslationDashboard({
  collection,
  locales,
  defaultLocale,
}: BulkTranslationDashboardProps) {
  const { abilities } = useTranslateKitConfig();
  const selection = useSelection();
  const view = useListView();
  const pageIds = useMemo(() => view.rows.map(({ id }) => id), [view.rows]);
  const list = useListTranslationState({ collection, ids: pageIds });

  const [stage, setStage] = useState<Stage>("closed");
  const viewIds = useViewIds(
    collection,
    view.where,
    stage === "nothing-selected" || stage === "view"
  );
  const headingId = useId();
  const close = () => setStage("closed");

  if (!abilities.translate && !abilities.cancel) return null;

  const allAvailable = selection.selectAll === SelectAllStatus.AllAvailable;
  const open = () => {
    if (allAvailable) setStage("view");
    else setStage(selection.count === 0 ? "nothing-selected" : "selection");
  };
  const selectedIds = selection.selectedIDs.map(String);

  return (
    <div className={styles.toolbar}>
      {abilities.cancel && <CancelQueued collection={collection} />}
      {abilities.translate && (
        <Button
          type="button"
          $variant="filled"
          aria-haspopup="dialog"
          aria-expanded={stage !== "closed"}
          onClick={open}
        >
          {selection.count > 0 ? `Translate · ${selection.count}` : "Translate"}
        </Button>
      )}
      <SideDrawer open={stage !== "closed"} onClose={close} labelledBy={headingId}>
        {stage === "nothing-selected" && (
          <NothingSelected
            headingId={headingId}
            collection={collection}
            viewIds={viewIds}
            onContinue={() => setStage("view")}
            onClose={close}
          />
        )}
        {(stage === "selection" || stage === "view") && (
          <CollectionPanel
            headingId={headingId}
            collection={collection}
            locales={locales}
            defaultLocale={defaultLocale}
            documents={stage === "selection" ? selectedIds : viewIds.data}
            rows={stage === "selection" ? view.rows : []}
            list={list.data}
            onDone={close}
            onClose={close}
          />
        )}
      </SideDrawer>
    </div>
  );
}
