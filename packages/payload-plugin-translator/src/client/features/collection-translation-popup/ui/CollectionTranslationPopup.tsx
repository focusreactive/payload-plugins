"use client";

import type { PropsWithChildren } from "react";

import { describePanelStatus, PanelStatusMarker } from "../../../entities/translation";
import type { PanelStatus } from "../../../entities/translation";
import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon";
import { useToggle } from "../../../shared/lib/utils/react/useToggle";
import Button from "../../../shared/ui/Button";
import Popup from "../../../shared/ui/Popup";

import styles from "./styles.module.scss";

type CollectionTranslationPopupProps = PropsWithChildren<{
  /** Aggregate status across the collection's jobs → the corner marker (same as the document trigger). */
  status?: PanelStatus;
  selectedCount: number;
}>;

function CollectionTranslationPopup({
  children,
  status,
  selectedCount,
}: CollectionTranslationPopupProps) {
  const [isPopupOpen, popupOpen] = useToggle();
  const { tone, title } = describePanelStatus(status, "Bulk translation");

  return (
    <Popup
      $align="start"
      onOpenChange={popupOpen.setValue}
      $trigger={
        <Button
          $size="md"
          $variant="outlined-light"
          className={styles["popup-trigger-button"]}
          aria-label={`Open translation options — ${title}`}
          title={title}
          onClick={popupOpen.setTrue}
        >
          <LanguageTranslateIcon />
          {selectedCount > 0 && (
            <>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              {selectedCount}
            </>
          )}
          <PanelStatusMarker tone={tone} />
        </Button>
      }
      open={isPopupOpen}
    >
      <div className={styles["popup-content"]}>{children}</div>
    </Popup>
  );
}

export default CollectionTranslationPopup;
