"use client";

import type { RefObject } from "react";

import type { Overlay, OverlayCtx } from "./createOverlay.js";

import { useEffect, useRef } from "react";

import { createOverlay } from "./createOverlay.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";

export type { OverlayCtx };

export function useVisualEditingOverlay(
  active: boolean,
  rootRef: RefObject<HTMLElement | null>,
  ctx: OverlayCtx
): void {
  const ctxRef = useRef(ctx);
  const overlayRef = useRef<Overlay | null>(null);

  useIsomorphicLayoutEffect(() => {
    ctxRef.current = ctx;
  });

  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    if (!root) return;
    const overlay = createOverlay(root, () => ctxRef.current);
    overlayRef.current = overlay;
    return () => {
      overlayRef.current = null;
      overlay.dispose();
    };
  }, [active, ctx.instantPreview, rootRef]);

  useEffect(() => {
    overlayRef.current?.applyMode();
  }, [ctx.mode]);
}
