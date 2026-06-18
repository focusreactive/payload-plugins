"use client";

import { Pill, PopupList, SectionTitle, useField, useRowLabel } from "@payloadcms/ui";
import { EyeIcon } from "@payloadcms/ui/icons/Eye";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HIDDEN_FIELD_NAME } from "./constants";

const baseClass = "blocks-field";

interface RowData {
  blockType?: string;
  blockName?: string;
  [key: string]: unknown;
}

function titleCase(input: string | undefined): string {
  if (!input) {
    return "Section";
  }

  return input.charAt(0).toUpperCase() + input.slice(1);
}

export function SectionVisibilityLabel() {
  const { data, path, rowNumber } = useRowLabel<RowData>();
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

        const existing = list.querySelector("[data-section-visibility-container]") as HTMLDivElement | null;

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

    const actionsButton = anchorRef.current?.closest(".blocks-field__row")?.querySelector<HTMLButtonElement>(".array-actions__button");

    if (actionsButton) {
      suppressNextActionsClickRef.current = true;
      actionsButton.click();
    }
  };

  return (
    <span ref={anchorRef} style={{ display: "contents" }}>
      <span className={`${baseClass}__block-number`}>{String((rowNumber ?? 0) + 1).padStart(2, "0")}</span>

      <Pill className={`${baseClass}__block-pill ${baseClass}__block-pill-${data?.blockType ?? ""}`} pillStyle="white" size="small">
        {titleCase(data?.blockType)}
      </Pill>

      <SectionTitle path={`${path}.blockName`} readOnly={false} />

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
            <PopupList.Button className={`popup-button-list__button array-actions__action${isHidden ? "" : " section-visibility-action--disable"}`} onClick={toggleVisibility}>
              <EyeIcon active={!isHidden} className="section-visibility-icon" />

              {isHidden ? "Show Section" : "Disable Section"}
            </PopupList.Button>
          </div>,
          portalContainer
        )}
    </span>
  );
}
