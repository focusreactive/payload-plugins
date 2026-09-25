"use client";

import type { PropsWithChildren } from "react";

import { describePanelStatus, PanelStatusMarker } from "../../../entities/translation/index.js";
import type { PanelStatus } from "../../../entities/translation/index.js";
import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon.js";
import { useToggle } from "../../../shared/lib/utils/react/useToggle.js";
import Button from "../../../shared/ui/Button/index.js";
import Popup from "../../../shared/ui/Popup/index.js";

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
