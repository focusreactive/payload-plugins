"use client";

import type { ReactNode } from "react";

import { LanguageTranslateIcon } from "../../../shared/lib/assets/icons/LanguageTranslateIcon";
import { useToggle } from "../../../shared/lib/utils/react/useToggle";
import Button from "../../../shared/ui/Button";
import Popup from "../../../shared/ui/Popup";

import styles from "./styles.module.scss";

interface OpenDocumentTranslationPopupProps {
  isLoading?: boolean;
  children: (props: { close: () => void }) => ReactNode;
}

function OpenDocumentTranslationPopup({
  children,
  isLoading,
}: OpenDocumentTranslationPopupProps) {
  const [isPopupOpen, popupOpen] = useToggle();

  return (
    <Popup
      $align="start"
      onOpenChange={popupOpen.setValue}
      $trigger={
        <Button
          $size="md"
          $variant="filled"
          $isIconButton
          className={styles["popup-trigger-button"]}
          aria-label="Open translation options"
          onClick={popupOpen.setTrue}
          disabled={isLoading}
          $isLoading={isLoading}
        >
          <LanguageTranslateIcon />
        </Button>
      }
      open={isPopupOpen}
    >
      <div className={styles["popup-content"]}>
        {children({ close: popupOpen.setFalse })}
      </div>
    </Popup>
  );
}

export default OpenDocumentTranslationPopup;
