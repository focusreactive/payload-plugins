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
    if (!confined) {
      return;
    }
    const root = document.documentElement;
    let last = "";
    let frame = 0;
    // Every frame: other modals (an upload picker) shift the layout without any resize or scroll event.
    const measure = () => {
      frame = requestAnimationFrame(measure);
      const form = markerRef.current?.closest("form");
      const editor = form?.querySelector<HTMLElement>(EDITOR_COLUMN_SELECTOR);
      if (!editor) {
        return;
      }
      const view = form?.closest(".collection-edit, .global-edit") ?? document;
      const preview =
        form?.querySelector<HTMLElement>(PREVIEW_COLUMN_SELECTOR) ??
        view.querySelector<HTMLElement>(PREVIEW_COLUMN_SELECTOR);
      const { left, top, width } = editorColumnBounds({
        editor: editor.getBoundingClientRect(),
        preview: preview?.getBoundingClientRect(),
      });
      const next = `${left}|${top}|${width}`;
      if (next !== last) {
        last = next;
        root.style.setProperty("--stacked-editing-left", `${left}px`);
        root.style.setProperty("--stacked-editing-width", `${width}px`);
        root.style.setProperty("--stacked-editing-top", `${top}px`);
      }
    };
    measure();
    root.setAttribute(CONFINED_ATTRIBUTE, "");
    return () => {
      cancelAnimationFrame(frame);
      root.removeAttribute(CONFINED_ATTRIBUTE);
      root.style.removeProperty("--stacked-editing-left");
      root.style.removeProperty("--stacked-editing-width");
      root.style.removeProperty("--stacked-editing-top");
    };
  }, [confined, markerRef]);

  return confined;
};
