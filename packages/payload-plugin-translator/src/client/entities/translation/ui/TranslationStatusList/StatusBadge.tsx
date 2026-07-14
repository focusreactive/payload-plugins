import ColorIndicator from "../../../../shared/ui/ColorIndicator";
import type { TranslationRowState } from "../../model/statusRows";
import { STATE_DOT } from "../../model/statusRows";

import styles from "./styles.module.scss";

/** Human label per state — also the row's accessible name (state is not conveyed by colour alone). */
export const STATE_LABEL: Record<TranslationRowState, string> = {
  failed: "Failed",
  running: "Translating",
  pending: "Queued",
  stale: "Out of date",
  translated: "Translated",
};

/**
 * Small per-row status dot. The colour is a secondary cue only — every row carries the state as
 * text ({@link STATE_LABEL}) in its meta line, so the dot never conveys state by colour alone.
 */
export function StatusBadge({ state }: { state: TranslationRowState }) {
  const dot = STATE_DOT[state];
  return (
    <span className={styles.badge} aria-hidden="true">
      <ColorIndicator $color={dot.color} $animated={dot.animated} />
    </span>
  );
}
