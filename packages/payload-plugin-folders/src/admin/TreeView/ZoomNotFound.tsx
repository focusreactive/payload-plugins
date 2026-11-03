import { Button } from "@payloadcms/ui";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";

/** What the view shows for `?folder=` naming a folder that is gone, or one the user cannot read. */
export const ZoomNotFound = ({
  onBack,
  title,
  translate,
}: {
  onBack: () => void;
  /** The name of the top level, which the way back leads to. */
  title: string;
  translate: Translate;
}): ReactNode => (
  <section className="fr-folders-empty-panel" data-testid="zoom-not-found" role="alert">
    <h2 className="fr-folders-empty-panel__title">{translate("zoomNotFound")}</h2>
    <p className="fr-folders-muted">{translate("zoomNotFoundHint")}</p>
    <Button
      buttonStyle="secondary"
      extraButtonProps={{ "data-testid": "zoom-back" }}
      margin={false}
      onClick={onBack}
      size="medium"
    >
      {translate("zoomBack", { title })}
    </Button>
  </section>
);
