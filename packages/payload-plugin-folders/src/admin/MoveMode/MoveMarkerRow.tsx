import type { KeyboardEvent, ReactNode } from "react";

import type { Translate } from "../compat.js";
import { ReasonTooltip } from "../ReasonTooltip.js";
import { indentPerLevel } from "../Tree/TreeRow.js";
import type { MoveMarker } from "./moveMarkers.js";

/** The marker buttons of the tree, in screen order, as Up and Down walk them. */
const markerSelector = '[data-testid="move-marker"]';

const walkMarkers = (event: KeyboardEvent<HTMLButtonElement>): void => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }
  const markers = Array.from(
    event.currentTarget
      .closest('[role="treegrid"]')
      ?.querySelectorAll<HTMLElement>(markerSelector) ?? []
  );
  const next = markers[markers.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1)];
  if (next) {
    event.preventDefault();
    next.focus();
  }
};

/**
 * One insert marker (spec section 7.4): a line with "Move 2 items here". A marker the rows cannot
 * go to stays, off, with the reason as its tooltip, and stays focusable so the reason can be read
 * from the keyboard. Up and Down walk the markers, Enter picks.
 */
export const MoveMarkerRow = ({
  count,
  marker,
  onPick,
  reason,
  translate,
}: {
  count: number;
  marker: MoveMarker;
  onPick: (marker: MoveMarker) => void;
  /** Why the marker is off, `null` when it can be picked. */
  reason: string | null;
  translate: Translate;
}): ReactNode => (
  <div
    aria-level={marker.level + 1}
    className="fr-folders-row fr-folders-row--status fr-folders-row--marker"
    data-testid="move-marker-row"
    role="row"
  >
    <div
      className="fr-folders-cell fr-folders-cell--wide"
      role="gridcell"
      style={{
        paddingInlineStart: `calc(var(--fr-folders-select-width) + var(--spacer-2-5) + ${
          marker.level * indentPerLevel
        }px)`,
      }}
    >
      <ReasonTooltip position="top" reason={reason}>
        <button
          aria-disabled={reason === null ? undefined : true}
          className="fr-folders-marker"
          data-marker={marker.key}
          data-testid="move-marker"
          onClick={() => {
            if (reason === null) {
              onPick(marker);
            }
          }}
          onKeyDown={walkMarkers}
          type="button"
        >
          <span aria-hidden="true" className="fr-folders-marker__line" />
          <span className="fr-folders-marker__label">{translate("moveModeHere", { count })}</span>
          {reason === null ? null : <span className="fr-folders-visually-hidden">{reason}</span>}
        </button>
      </ReasonTooltip>
    </div>
  </div>
);
