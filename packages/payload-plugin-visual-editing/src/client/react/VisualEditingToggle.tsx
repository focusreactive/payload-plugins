"use client";

import { useEffect, useRef } from "react";

import type { FollowingSession } from "../sessionOverlay.js";

import { startSessionToggle } from "../sessionOverlay.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";
import { useVisualEditing } from "./VisualEditingProvider.js";

export function VisualEditingToggle(): null {
  const session = useVisualEditing();
  const { setMode } = session;
  const latest = useRef(session);
  const toggle = useRef<FollowingSession | null>(null);

  useIsomorphicLayoutEffect(() => {
    latest.current = session;
  });

  useEffect(() => {
    const started = startSessionToggle(document, () => latest.current, setMode);
    toggle.current = started;
    return () => {
      toggle.current = null;
      started.dispose();
    };
  }, [setMode]);

  useEffect(() => {
    toggle.current?.sync();
  }, [session]);

  return null;
}
