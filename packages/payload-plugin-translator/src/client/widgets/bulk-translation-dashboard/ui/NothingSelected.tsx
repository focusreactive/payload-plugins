"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import type { DocumentId } from "../../../../types/wire/primitives.js";
import { CloseIcon } from "../../../shared/lib/assets/icons/CloseIcon.js";
import Button from "../../../shared/ui/Button/index.js";

import styles from "./styles.module.scss";

type NothingSelectedProps = {
  headingId: string;
  collection: string;
  viewIds: Pick<UseQueryResult<readonly DocumentId[]>, "data" | "isError" | "refetch">;
  onContinue: () => void;
  onClose: () => void;
};

function ViewCount({ collection, viewIds }: Pick<NothingSelectedProps, "collection" | "viewIds">) {
  if (viewIds.isError) {
    return (
      <p role="alert" className={styles.text}>
        Couldn’t count the documents this view shows.{" "}
        <button type="button" className={styles.link} onClick={() => void viewIds.refetch()}>
          Try again
        </button>
      </p>
    );
  }
  const count = viewIds.data ? String(viewIds.data.length) : "Counting";
  return (
    <p className={styles.text}>
      {count} {collection} — the current search and filters, not the whole collection. Locales and
      options are chosen on the next step.
    </p>
  );
}

/** With no row ticked: take what the view shows, or go back and tick rows. */
export function NothingSelected({
  headingId,
  collection,
  viewIds,
  onContinue,
  onClose,
}: NothingSelectedProps) {
  const count = viewIds.data?.length ?? 0;
  return (
    <>
      <header className={styles.head}>
        <h2 id={headingId} className={styles.heading}>
          Translate {collection}
        </h2>
        <button type="button" className={styles.close} aria-label="Close panel" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      <div className={styles.body}>
        <p className={styles.lead}>Nothing is ticked in the list. Two ways on:</p>
        <section className={styles.way}>
          <h3 className={styles.wayTitle}>Take everything this view shows</h3>
          <ViewCount collection={collection} viewIds={viewIds} />
          <Button type="button" $variant="filled" disabled={count === 0} onClick={onContinue}>
            {`Continue with all ${count}`}
          </Button>
        </section>
        <section className={styles.way}>
          <h3 className={styles.wayTitle}>Pick them in the list</h3>
          <p className={styles.text}>
            Tick the rows behind this panel; the button above the table counts them as you go.
          </p>
          <Button type="button" $variant="outlined" onClick={onClose}>
            Back to the list
          </Button>
        </section>
      </div>
    </>
  );
}
