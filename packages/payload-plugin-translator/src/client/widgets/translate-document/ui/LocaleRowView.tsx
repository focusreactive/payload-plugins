"use client";

import { useState } from "react";

import type { LocaleState, TreeNode } from "../../../../types/wire/DocumentTranslationState.js";
import type { LocaleCode } from "../../../../types/wire/primitives.js";
import type { DocumentAddress } from "../../../entities/translation/index.js";
import { LocaleStatus, localeRowOf, treeModeOf } from "../../../entities/translation/index.js";
import { LocaleActions } from "../../../features/locale-actions/index.js";
import { TranslateFields } from "../../../features/translate-fields/index.js";

import styles from "./styles.module.scss";

type LocaleRowViewProps = {
  document: DocumentAddress;
  state: LocaleState;
  tree: readonly TreeNode[];
  excluded: readonly string[];
  source: LocaleCode;
  labelOf: (locale: LocaleCode) => string;
  startBlocked: boolean;
  now: Date;
};

export function LocaleRowView({
  document,
  state,
  tree,
  excluded,
  source,
  labelOf,
  startBlocked,
  now,
}: LocaleRowViewProps) {
  const [expanded, setExpanded] = useState(false);
  const row = localeRowOf(state);
  const mode = treeModeOf(row);
  const label = labelOf(state.locale);
  const isOpen = expanded && mode !== null;

  const common = {
    document,
    source,
    locale: state.locale,
    localeLabel: label,
    sourceLabel: labelOf(source),
    tree,
    excluded,
    startBlocked,
  };

  return (
    <li className={isOpen ? `${styles.locale} ${styles.open}` : styles.locale}>
      <div className={styles.row}>
        {mode === null ? (
          <span className={styles.chevron} />
        ) : (
          <button
            type="button"
            className={styles.chevron}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Hide" : "Show"} ${label} fields`}
            onClick={() => setExpanded(!isOpen)}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path
                d={isOpen ? "M1 3l4 4 4-4" : "M3 1l4 4-4 4"}
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        )}
        <span className={styles.name}>{label}</span>
        <LocaleStatus row={row} labelOf={labelOf} now={now} />
        <LocaleActions
          document={document}
          source={source}
          locale={state.locale}
          localeLabel={label}
          row={row}
          startBlocked={startBlocked}
        />
      </div>
      {isOpen && mode === "pick" && (
        <TranslateFields
          {...common}
          mode="pick"
          verdicts={state.content.kind === "tracked" ? state.content.verdicts : {}}
        />
      )}
      {isOpen && mode === "whole" && <TranslateFields {...common} mode="whole" />}
    </li>
  );
}
