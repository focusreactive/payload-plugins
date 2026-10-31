import type { KeyboardEvent, ReactNode } from "react";

import type { Translate } from "../compat.js";
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
 * go to stays, off, with the reason written after the label, and stays focusable so the reason is
 * reachable from the keyboard. The reason is inline, not a tooltip: a tooltip over a line this thin
 * would cover the name of the folder above it. Only one marker is in the tab order at a time (the
 * one that has the focus, else the first that can be picked); Up and Down walk the rest, Enter picks.
 */
export const MoveMarkerRow = ({
  count,
  isTabStop,
  marker,
  onFocused,
  onPick,
  reason,
  translate,
}: {
  count: number;
  /** The one marker Tab reaches. */
  isTabStop: boolean;
  marker: MoveMarker;
  /** The marker took the focus, so it is the tab stop from now on. */
  onFocused: (marker: MoveMarker) => void;
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
        onFocus={() => onFocused(marker)}
        onKeyDown={walkMarkers}
        tabIndex={isTabStop ? 0 : -1}
        type="button"
      >
        <span aria-hidden="true" className="fr-folders-marker__line" />
        <span className="fr-folders-marker__label">{translate("moveModeHere", { count })}</span>
        {reason === null ? null : (
          <span className="fr-folders-marker__reason" data-testid="move-marker-reason">
            {reason}
          </span>
        )}
      </button>
    </div>
  </div>
);
