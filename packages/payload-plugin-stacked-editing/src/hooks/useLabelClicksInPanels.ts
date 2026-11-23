"use client";

import { useEffect } from "react";

import { panelInputOfLabel } from "../lib/domPath.js";

export const useLabelClicksInPanels = (ownerId: string) => {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented || !(event.target instanceof Element)) {
        return;
      }
      const input = panelInputOfLabel(event.target, ownerId);
      if (input) {
        event.preventDefault();
        input.focus();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [ownerId]);
};
