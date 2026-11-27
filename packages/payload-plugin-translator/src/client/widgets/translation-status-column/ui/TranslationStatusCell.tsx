"use client";

import type { DefaultCellComponentProps } from "payload";
import { useMemo } from "react";

import type { ListChip } from "../../../entities/translation/index.js";
import { listChipOf, useListTranslationState } from "../../../entities/translation/index.js";
import { useListView } from "../../../shared/lib/payload/hooks/useListView.js";
import { timeAgo } from "../../../shared/lib/time/timeAgo.js";

import styles from "./styles.module.scss";

type ChipLook = { className: string; mark: string; says: string };

function lookOf(chip: ListChip, now: Date): ChipLook {
  switch (chip.kind) {
    case "translated":
      return {
        className: styles.translated,
        mark: "",
        says: chip.translatedAt ? `translated ${timeAgo(chip.translatedAt, now)}` : "translated",
      };
    case "not-translated":
      return { className: styles.notTranslated, mark: "", says: "not translated" };
    case "translating":
      return { className: styles.translating, mark: "⟳", says: "translating now" };
    case "queued":
      return { className: styles.queued, mark: "◷", says: "queued" };
    case "failed":
      return { className: styles.failed, mark: "!", says: `the run failed: ${chip.message}` };
  }
}

/**
 * Every cell on the page asks for the same ids, so the cells share one read; each finds its own row
 * in the answer. A row the answer does not hold shows nothing.
 */
export default function TranslationStatusCell({ rowData }: DefaultCellComponentProps) {
  const { collection, rows } = useListView();
  const ids = useMemo(() => rows.map(({ id }) => id), [rows]);
  const read = useListTranslationState({ collection, ids });

  const id = String(rowData.id);
  const document = read.data?.docs.find((doc) => doc.id === id);
  if (!document) return null;

  const now = new Date();
  return (
    <ul className={styles.chips} aria-label="Translations">
      {document.locales.map((state) => {
        const chip = listChipOf(state);
        const { className, mark, says } = lookOf(chip, now);
        return (
          <li
            key={chip.locale}
            className={`${styles.chip} ${className}`}
            title={`${chip.locale} — ${says}`}
          >
            {mark && <span aria-hidden="true">{mark}</span>}
            {chip.locale}
            <span className={styles.hidden}>: {says}</span>
          </li>
        );
      })}
    </ul>
  );
}
