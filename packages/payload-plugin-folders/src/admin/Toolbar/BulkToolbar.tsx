import { Button } from "@payloadcms/ui";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";
import { ReasonTooltip } from "../ReasonTooltip.js";
import type { TreeItem } from "../../types.js";
import { toolbarActions, toolbarStateOf } from "./toolbarActions.js";
import type { ToolbarAction } from "./toolbarActions.js";

export type BulkToolbarProps = {
  items: readonly TreeItem[];
  onCancel: () => void;
  /**
   * What each button does. An action with no handler yet (its dialog is a later ticket) is shown
   * as access allows and does nothing when pressed.
   */
  onAction: (action: ToolbarAction) => void;
  translate: Translate;
};

const labelKeys = {
  delete: "actionDelete",
  duplicate: "actionDuplicate",
  move: "actionMove",
  moveTo: "actionMoveTo",
  publish: "actionPublish",
  settings: "actionSettings",
  unpublish: "actionUnpublish",
} as const satisfies Record<ToolbarAction, string>;

/**
 * The selection toolbar of spec section 7.2. It takes the place of the header row while anything
 * is selected. A button the selection's access flags refuse stays in place, off, with the reason
 * on hover and focus.
 */
export const BulkToolbar = ({
  items,
  onAction,
  onCancel,
  translate,
}: BulkToolbarProps): ReactNode => {
  const states = toolbarStateOf(items);

  return (
    <header
      aria-label={translate("toolbarLabel")}
      className="fr-folders-toolbar"
      data-testid="bulk-toolbar"
      role="toolbar"
    >
      <span aria-live="polite" className="fr-folders-toolbar__count" role="status">
        {translate("itemsSelected", { count: items.length })}
      </span>
      <div className="fr-folders-toolbar__actions">
        {toolbarActions.map((action) => {
          const state = states[action];
          if (!state.visible) {
            return null;
          }
          const isOff = state.disabledBecause !== null;

          return (
            <ReasonTooltip key={action} reason={isOff ? translate("actionNotAllowed") : null}>
              <Button
                buttonStyle="ghost"
                disabled={isOff}
                // Kept focusable while off, so the reason is reachable from the keyboard too.
                extraButtonProps={{ disabled: false }}
                margin={false}
                onClick={() => onAction(action)}
                size="medium"
              >
                {translate(labelKeys[action])}
              </Button>
            </ReasonTooltip>
          );
        })}
      </div>
      <Button buttonStyle="secondary" margin={false} onClick={onCancel} size="medium">
        {translate("actionCancel")}
      </Button>
    </header>
  );
};
