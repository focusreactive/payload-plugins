import { Button } from "@payloadcms/ui";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";

/**
 * The bar that takes the header's place while Move mode is on: what is moving, and the way out
 * (spec section 7.4). Escape leaves too; the button is for the pointer.
 */
export const MoveModeBar = ({
  count,
  onCancel,
  translate,
}: {
  count: number;
  onCancel: () => void;
  translate: Translate;
}): ReactNode => (
  <header
    aria-label={translate("moveModeBarLabel")}
    className="fr-folders-toolbar"
    data-testid="move-mode-bar"
    role="toolbar"
  >
    <span aria-live="polite" className="fr-folders-toolbar__count" role="status">
      {translate("moveModeBar", { count })}
    </span>
    <div className="fr-folders-toolbar__actions" />
    <Button buttonStyle="secondary" margin={false} onClick={onCancel} size="medium">
      {translate("actionCancel")}
    </Button>
  </header>
);
