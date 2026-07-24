"use client";

import { AutoTranslateIcon } from "../../../../shared/lib/assets/icons/AutoTranslateIcon";
import InfoPopover from "../../../../shared/ui/InfoPopover";

import styles from "./styles.module.scss";

type AutoTranslateMarkerProps = {
  /** Target locale codes this collection auto-translates into (source already excluded). */
  targets: string[];
  /** The resolved source locale code changes are watched on. */
  sourceLocale: string;
};

/**
 * A quiet, off-to-the-side marker in the translation popups' header that a collection is opted into
 * auto-translate. The detail lives behind the icon (tap/click), not the layout — ambient config the
 * editor rarely needs. Rendered only when auto-translate is enabled.
 */
export function AutoTranslateMarker({ targets, sourceLocale }: AutoTranslateMarkerProps) {
  return (
    <InfoPopover
      label="Auto-translate enabled"
      className={styles.marker}
      icon={<AutoTranslateIcon />}
      content={
        <span className={styles.tip}>
          Auto-translate is on. Publishing changes to the source (<code>{sourceLocale}</code>)
          content queues translations into {targets.join(" · ")}.
        </span>
      }
    />
  );
}
