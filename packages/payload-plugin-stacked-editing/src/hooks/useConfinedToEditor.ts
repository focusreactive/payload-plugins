"use client";

import { useLivePreviewContext } from "@payloadcms/ui";
import type { RefObject } from "react";

import {
  EDITOR_COLUMN_SELECTOR,
  PREVIEW_COLUMN_SELECTOR,
  editorColumnBounds,
} from "../lib/confine.js";
import { CONFINED_ATTRIBUTE } from "../lib/constants.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";

const BOUND_PROPERTIES = ["left", "top", "width"] as const;

const measureEditorColumn = (marker: HTMLElement | null) => {
  const form = marker?.closest("form");
  const editor = form?.querySelector<HTMLElement>(EDITOR_COLUMN_SELECTOR);
  if (!form || !editor) {
    return null;
  }
  const view = form.closest(".collection-edit, .global-edit") ?? document;
  const preview =
    form.querySelector<HTMLElement>(PREVIEW_COLUMN_SELECTOR) ??
    view.querySelector<HTMLElement>(PREVIEW_COLUMN_SELECTOR);
  return editorColumnBounds({
    editor: editor.getBoundingClientRect(),
    preview: preview?.getBoundingClientRect(),
  });
};

const setBoundProperties = (root: HTMLElement, bounds: Record<string, number> | null) => {
  for (const property of BOUND_PROPERTIES) {
    const name = `--stacked-editing-${property}`;
    if (bounds) {
      root.style.setProperty(name, `${bounds[property]}px`);
    } else {
      root.style.removeProperty(name);
    }
  }
};

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
    let lastBounds = "";
    let frame = 0;
    // Every frame: other modals (an upload picker) shift the layout without any resize or scroll event.
    const followEditorColumn = () => {
      frame = requestAnimationFrame(followEditorColumn);
      const bounds = measureEditorColumn(markerRef.current);
      const serialized = JSON.stringify(bounds);
      if (bounds && serialized !== lastBounds) {
        lastBounds = serialized;
        setBoundProperties(root, bounds);
      }
    };
    followEditorColumn();
    root.setAttribute(CONFINED_ATTRIBUTE, "");
    return () => {
      cancelAnimationFrame(frame);
      root.removeAttribute(CONFINED_ATTRIBUTE);
      setBoundProperties(root, null);
    };
  }, [confined, markerRef]);

  return confined;
};
