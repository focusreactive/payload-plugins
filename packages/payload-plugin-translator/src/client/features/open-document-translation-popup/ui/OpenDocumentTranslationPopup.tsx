"use client";

import type { ReactNode } from "react";

import { describePanelStatus, PanelStatusMarker } from "../../../entities/translation";
import type { PanelStatus } from "../../../entities/translation";
import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon";
import { useToggle } from "../../../shared/lib/utils/react/useToggle";
import Button from "../../../shared/ui/Button";
import Popup from "../../../shared/ui/Popup";

import styles from "./styles.module.scss";

type OpenDocumentTranslationPopupProps = {
  isLoading?: boolean;
  /** Aggregate translation state → the marker + tooltip on the trigger (detail lives in the popup). */
  status?: PanelStatus;
  children: (props: { close: () => void }) => ReactNode;
};

function OpenDocumentTranslationPopup({
  children,
  isLoading,
  status,
}: OpenDocumentTranslationPopupProps) {
  const [isPopupOpen, popupOpen] = useToggle();
  const { tone, title } = describePanelStatus(status, "Translate this document");

  return (
    <Popup
      $align="start"
      onOpenChange={popupOpen.setValue}
      $trigger={
        <Button
          // Explicit: the control is injected into Payload's document `<form>`, so a bare button
          // would default to type="submit" and save the whole page on click.
          type="button"
          $size="md"
          $variant="outlined-light"
          $isIconButton
          className={styles["popup-trigger-button"]}
          aria-label={`Open translation options — ${title}`}
          title={title}
          onClick={popupOpen.setTrue}
          disabled={isLoading}
          $isLoading={isLoading}
        >
          <LanguageTranslateIcon />
          <PanelStatusMarker tone={tone} />
        </Button>
      }
      open={isPopupOpen}
    >
      <div className={styles["popup-content"]}>{children({ close: popupOpen.setFalse })}</div>
    </Popup>
  );
}

export default OpenDocumentTranslationPopup;
