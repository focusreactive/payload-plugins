"use client";

import type { RefObject } from "react";

import type { OverlayCtx } from "./overlay/createOverlay.js";

import { useEffect, useRef } from "react";

import { createOverlay } from "./overlay/createOverlay.js";

export type { OverlayCtx };

export function useVisualEditingOverlay(
  enabled: boolean,
  rootRef: RefObject<HTMLElement | null>,
  ctx: OverlayCtx
): void {
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  // Include mode in deps so the overlay tears down and rebuilds when the user flips between
  // 'always' and 'hover' — otherwise existing targets keep their old paint state.
  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    return createOverlay(root, () => ctxRef.current);
  }, [enabled, ctx.mode, rootRef]);
}
