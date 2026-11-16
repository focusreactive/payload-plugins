"use client";

import { useLivePreviewContext } from "@payloadcms/ui";
import { useEffect, useLayoutEffect } from "react";
import type { RefObject } from "react";

import {
  EDITOR_COLUMN_SELECTOR,
  PREVIEW_COLUMN_SELECTOR,
  editorColumnBounds,
} from "../lib/confine.js";
import { CONFINED_ATTRIBUTE } from "./styles.js";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * While Live Preview is open beside the editor, keep the panels inside the editor column so the
 * preview stays visible and clickable. Publishes the column's bounds as CSS variables on <html>
 * (re-measured on resize and scroll) for the drawers' `--confined` class; returns whether that mode is on.
 */
export const useConfinedToEditor = ({
  active,
  markerRef,
}: {
  active: boolean;
  markerRef: RefObject<HTMLElement | null>;
}): boolean => {
  const { isLivePreviewing, previewWindowType } = useLivePreviewContext();
  const confined = active && isLivePreviewing && previewWindowType === "iframe";

  useIsomorphicLayoutEffect(() => {
    const form = markerRef.current?.closest("form");
    const editor = form?.querySelector<HTMLElement>(EDITOR_COLUMN_SELECTOR);
    if (!confined || !form || !editor) {
      return;
    }
    const root = document.documentElement;
    const measure = () => {
      const preview = form.querySelector<HTMLElement>(PREVIEW_COLUMN_SELECTOR);
      const { left, top, width } = editorColumnBounds({
        editor: editor.getBoundingClientRect(),
        preview: preview?.getBoundingClientRect(),
      });
      root.style.setProperty("--stacked-editing-left", `${left}px`);
      root.style.setProperty("--stacked-editing-width", `${width}px`);
      root.style.setProperty("--stacked-editing-top", `${top}px`);
    };
    measure();
    root.setAttribute(CONFINED_ATTRIBUTE, "");
    const observer = new ResizeObserver(measure);
    observer.observe(editor);
    window.addEventListener("resize", measure);
    // The preview column is sticky: its top changes while the page scrolls past the header.
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
      root.removeAttribute(CONFINED_ATTRIBUTE);
      root.style.removeProperty("--stacked-editing-left");
      root.style.removeProperty("--stacked-editing-width");
      root.style.removeProperty("--stacked-editing-top");
    };
  }, [confined, markerRef]);

  return confined;
};
