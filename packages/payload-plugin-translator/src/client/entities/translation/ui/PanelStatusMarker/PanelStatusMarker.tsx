import ColorIndicator from "../../../../shared/ui/ColorIndicator";
import type { MarkerTone } from "../../model/panelStatus";
import { MARKER_DOT } from "../../model/panelStatus";

import styles from "./styles.module.scss";

/**
 * The aggregate status dot overlaid on a translate trigger's top-right corner. Uses the SAME
 * coloured-dot vocabulary as the popup's per-locale status list ({@link MARKER_DOT}), so the panel
 * badge and the popup rows read as one system. Shared by the document and collection triggers.
 *
 * Colour is not the sole cue: the host button carries a `title` + `aria-label` naming the exact
 * state for assistive tech (this dot is `aria-hidden`), and in-progress carries a pulse.
 */
export function PanelStatusMarker({ tone }: { tone?: MarkerTone }) {
  if (!tone) {
    return null;
  }
  return (
    <span className={styles.marker} aria-hidden="true">
      <ColorIndicator $color={MARKER_DOT[tone].color} $animated={MARKER_DOT[tone].animated} />
    </span>
  );
}
