"use client";

import type { PropsWithChildren } from "react";

import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon";
import { useToggle } from "../../../shared/lib/utils/react/useToggle";
import Button from "../../../shared/ui/Button";
import ColorIndicator from "../../../shared/ui/ColorIndicator";
import Popup from "../../../shared/ui/Popup";

import styles from "./styles.module.scss";

type CollectionTranslationPopupProps = PropsWithChildren<{
  translationInProgress: boolean;
  selectedCount: number;
}>;

function CollectionTranslationPopup({
  children,
  translationInProgress,
  selectedCount,
}: CollectionTranslationPopupProps) {
  const [isPopupOpen, popupOpen] = useToggle();

  return (
    <Popup
      $align="start"
      onOpenChange={popupOpen.setValue}
      $trigger={
        <Button
          $size="md"
          $variant="filled"
          className={styles["popup-trigger-button"]}
          aria-label="Open translation options"
          onClick={popupOpen.setTrue}
        >
          {translationInProgress && (
            <ColorIndicator
              title="Translations In Progress"
              $animated
              $color="blue"
            />
          )}
          <LanguageTranslateIcon />
          {selectedCount > 0 && !translationInProgress && (
            <>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              {selectedCount}
            </>
          )}
        </Button>
      }
      open={isPopupOpen}
    >
      <div className={styles["popup-content"]}>{children}</div>
    </Popup>
  );
}

export default CollectionTranslationPopup;
