"use client";

import { useEffect } from "react";

import {
  TOGGLE_SELECTOR,
  fieldPathOfHeaderAction,
  isOwnedBy,
  parentFieldPathOf,
  rowPathFromToggle,
} from "../lib/domPath.js";
import { classifyHeaderClick } from "../lib/headerClick.js";
import type { DefaultMode } from "../lib/headerClick.js";
import { useLatest } from "./useLatest.js";

const isPlainPrimaryClick = (event: MouseEvent): event is MouseEvent & { target: Element } =>
  event.button === 0 && !event.defaultPrevented && event.target instanceof Element;

const headerClickAction = (toggle: Element, event: MouseEvent, mode: DefaultMode) => {
  const actionsWrap = toggle.parentElement?.querySelector(":scope > .collapsible__actions-wrap");
  const chevron = actionsWrap?.querySelector(":scope > .collapsible__indicator");
  const isKeyboardActivation = event.detail === 0;
  return classifyHeaderClick({
    actionsWrap: actionsWrap?.getBoundingClientRect(),
    chevron: chevron?.getBoundingClientRect(),
    mode,
    point: isKeyboardActivation ? null : { x: event.clientX, y: event.clientY },
  });
};

export const useRowHeaderClicks = ({
  ownerId,
  mode,
  openRow,
  onInlineToggle,
}: {
  ownerId: string;
  mode: DefaultMode;
  openRow: (rowPath: string) => boolean;
  onInlineToggle: (fieldPath: string) => void;
}) => {
  const latest = useLatest({ mode, openRow, onInlineToggle });

  useEffect(() => {
    const isOwn = (element: Element) => isOwnedBy(element, ownerId);

    const onClick = (event: MouseEvent) => {
      if (!isPlainPrimaryClick(event)) {
        return;
      }
      const toggle = event.target.closest(TOGGLE_SELECTOR);
      if (!toggle) {
        const headerActionField = fieldPathOfHeaderAction(event.target);
        if (headerActionField && isOwn(event.target)) {
          latest.current.onInlineToggle(headerActionField);
        }
        return;
      }
      const rowPath = isOwn(toggle) ? rowPathFromToggle(toggle) : null;
      if (!rowPath) {
        return;
      }
      if (event.altKey || headerClickAction(toggle, event, latest.current.mode) === "inline") {
        latest.current.onInlineToggle(parentFieldPathOf(rowPath));
        return;
      }
      if (latest.current.openRow(rowPath)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [latest, ownerId]);
};
