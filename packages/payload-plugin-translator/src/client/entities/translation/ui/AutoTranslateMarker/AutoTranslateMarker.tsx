"use client";

import { AutoTranslateIcon } from "../../../../shared/lib/assets/icons/AutoTranslateIcon";
import Tooltip from "../../../../shared/ui/Tooltip";

import styles from "./styles.module.scss";

type AutoTranslateMarkerProps = {
  /** Target locale codes this collection auto-translates into (source already excluded). */
  targets: string[];
  /** The resolved source locale code changes are watched on. */
  sourceLocale: string;
};

/**
 * A quiet, off-to-the-side marker in the translation popups' header (document + collection): a single
 * muted icon that a collection is opted into auto-translate. The detail lives in the tooltip, not the
 * layout — this is ambient config the editor rarely needs, so it stays out of the popup's main vertical
 * flow (title / Translate / Status). Rendered only when auto-translate is enabled.
 */
export function AutoTranslateMarker({ targets, sourceLocale }: AutoTranslateMarkerProps) {
  return (
    <Tooltip
      content={
        <span className={styles.tip}>
          Auto-translate is on. Publishing changes to the source (<code>{sourceLocale}</code>)
          content queues translations into {targets.join(" · ")}.
        </span>
      }
    >
      <span className={styles.marker} tabIndex={0} aria-label="Auto-translate enabled">
        <AutoTranslateIcon />
      </span>
    </Tooltip>
  );
}
