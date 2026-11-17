"use client";

import type { RefObject } from "react";

import type { Overlay } from "./createOverlay.js";
import type { OverlayScope, ScopedOverlayCtx } from "./overlayScope.js";

import { useEffect, useRef } from "react";

import { cleanPageAround } from "./overlay/markerCleaner.js";
import { startOverlay } from "./overlayScope.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";

export function useVisualEditingOverlay(
  active: boolean,
  isDraft: boolean,
  rootRef: RefObject<HTMLElement | null>,
  scope: OverlayScope,
  ctx: ScopedOverlayCtx
): void {
  const ctxRef = useRef(ctx);
  const scopeRef = useRef(scope);
  const overlayRef = useRef<Overlay | null>(null);

  useIsomorphicLayoutEffect(() => {
    ctxRef.current = ctx;
    scopeRef.current = scope;
  });

  useEffect(() => {
    if (active || !isDraft) return;
    const root = rootRef.current;
    if (!root) return;
    const cleaner = cleanPageAround(root);
    return () => cleaner.dispose();
  }, [active, isDraft, rootRef]);

  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    if (!root) return;
    const overlay = startOverlay(
      () => scopeRef.current,
      root,
      () => ctxRef.current
    );
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
