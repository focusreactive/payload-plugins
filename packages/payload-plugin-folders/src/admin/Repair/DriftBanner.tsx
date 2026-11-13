import { Button } from "@payloadcms/ui";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";

/**
 * "Some URLs are out of date. Rebuild full URLs" (spec section 5.9), in the same strip and style
 * as the banners of running operations. A user who cannot repair is told who can.
 */
export const DriftBanner = ({
  canRepair,
  onRebuild,
  translate,
}: {
  canRepair: boolean;
  onRebuild: () => void;
  translate: Translate;
}): ReactNode => (
  <div
    className="fr-folders-operation-banner"
    data-kind="drift"
    data-testid="drift-banner"
    role="status"
  >
    <span data-testid="drift-banner-text">{translate("driftBanner")}</span>
    {canRepair ? (
      <Button
        buttonStyle="secondary"
        extraButtonProps={{ "data-testid": "drift-banner-rebuild" }}
        margin={false}
        onClick={onRebuild}
        size="medium"
      >
        {translate("repairTitle")}
      </Button>
    ) : (
      <span className="fr-folders-muted">{translate("driftAskAdmin")}</span>
    )}
  </div>
);
