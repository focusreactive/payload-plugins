"use client";

import { CardLabel } from "@focus-reactive/payload-plugin-stacked-editing/client";
import { PopupList, useField, useRowLabel, useTranslation } from "@payloadcms/ui";
import { EyeIcon } from "@payloadcms/ui/icons/Eye";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { HIDDEN_FIELD_NAME } from "./constants";
import { ReusableSectionName } from "./ReusableSectionName";

const VISIBILITY_ACTION_LABELS = {
  en: { hide: "Hide from page", show: "Show on page", hidden: "Hidden" },
  es: { hide: "Ocultar de la página", show: "Mostrar en la página", hidden: "Oculta" },
} as const;

const REUSABLE_SECTION_BLOCK = "globalSectionSlot";

const HIDDEN_BADGE_STYLE = {
  alignSelf: "center",
  border: "1px solid var(--theme-elevation-250)",
  borderRadius: "var(--style-radius-s)",
  color: "var(--theme-elevation-650)",
  flexShrink: 0,
  fontSize: "11px",
  lineHeight: "18px",
  marginLeft: "8px",
  padding: "0 6px",
} as const;

interface RowData {
  blockType?: string;
  [key: string]: unknown;
}

/**
 * Row header for every page/post section: the stacked-editing preview card (number, thumbnail,
 * a title read from the section's content, the section type underneath) plus the
 * "Hide from page" / "Show on page" action in the row's `…` menu.
 */
export function SectionVisibilityLabel() {
  const { data, path } = useRowLabel<RowData>();
  const { i18n } = useTranslation();
  const labels = i18n.language === "es" ? VISIBILITY_ACTION_LABELS.es : VISIBILITY_ACTION_LABELS.en;
  const { value, setValue } = useField<boolean>({
    path: `${path}.${HIDDEN_FIELD_NAME}`,
  });
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  const anchorRef = useRef<HTMLSpanElement>(null);
  const suppressNextActionsClickRef = useRef(false);

  const isHidden = value === true;

  useEffect(() => {
    const row = anchorRef.current?.closest(".blocks-field__row") as HTMLElement | null;
    if (!row) return;

    const toggleWrapper = row.querySelector(".collapsible__toggle-wrap") as HTMLElement | null;
    const content = row.querySelector(".collapsible__content") as HTMLElement | null;

    const toggleStyles = (el: HTMLElement | null, style: "bg" | "opacity", isHidden?: boolean) => {
      if (!el) return;

      if (isHidden) {
        if (style === "bg") {
          el.style.backgroundColor = "var(--theme-elevation-100)";
        } else {
          el.style.opacity = "0.7";
        }
      } else {
        if (style === "bg") {
          el.style.removeProperty("background-color");
        } else {
          el.style.removeProperty("opacity");
        }
      }
    };

    toggleStyles(row, "opacity", isHidden);
    toggleStyles(toggleWrapper, "bg", isHidden);
    toggleStyles(content, "bg", isHidden);

    return () => {
      toggleStyles(row, "opacity");
      toggleStyles(toggleWrapper, "bg");
      toggleStyles(content, "bg");
    };
  }, [isHidden]);

  useEffect(() => {
    const row = anchorRef.current?.closest(".blocks-field__row");
    if (!row) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const dropdownMenuTrigger = target.closest?.(".array-actions__button");
      if (!dropdownMenuTrigger) return;

      const nearestRow = dropdownMenuTrigger.closest(".blocks-field__row, .array-field__row");
      if (nearestRow !== row) return;

      if (suppressNextActionsClickRef.current) {
        suppressNextActionsClickRef.current = false;
        return;
      }

      setTimeout(() => {
        const list = document.body.querySelector(".popup__content .popup-button-list");
        if (!list) return;

        const existing = list.querySelector(
          "[data-section-visibility-container]"
        ) as HTMLDivElement | null;

        if (existing) {
          setPortalContainer(existing);
          return;
        }

        const container = document.createElement("div");
        container.setAttribute("data-section-visibility-container", "true");
        list.insertBefore(container, list.firstChild);
        setPortalContainer(container);
      }, 0);
    };

    row.addEventListener("click", handleClick);

    return () => {
      row.removeEventListener("click", handleClick);
    };
  }, []);

  const toggleVisibility = () => {
    setValue(!isHidden);

    const actionsButton = anchorRef.current
      ?.closest(".blocks-field__row")
      ?.querySelector<HTMLButtonElement>(".array-actions__button");

    if (actionsButton) {
      suppressNextActionsClickRef.current = true;
      actionsButton.click();
    }
  };

  return (
    <span ref={anchorRef} style={{ display: "contents" }}>
      <CardLabel />

      {data?.blockType === REUSABLE_SECTION_BLOCK ? (
        <ReusableSectionName path={`${path}.reference`} />
      ) : null}

      {isHidden ? <span style={HIDDEN_BADGE_STYLE}>{labels.hidden}</span> : null}

      {portalContainer &&
        createPortal(
          <div>
            <style>{`
              .section-visibility-action--disable {
                color: var(--theme-error-500);
              }
              .section-visibility-action--disable:hover,
              .section-visibility-action--disable:focus {
                background-color: var(--theme-error-100);
                color: var(--theme-error-600);
              }
              .section-visibility-icon {
                width: 17px;
                height: 17px;
              }
            `}</style>
            <PopupList.Button
              className={`popup-button-list__button array-actions__action${isHidden ? "" : " section-visibility-action--disable"}`}
              onClick={toggleVisibility}
            >
              <EyeIcon active={!isHidden} className="section-visibility-icon" />

              {isHidden ? labels.show : labels.hide}
            </PopupList.Button>
          </div>,
          portalContainer
        )}
    </span>
  );
}
