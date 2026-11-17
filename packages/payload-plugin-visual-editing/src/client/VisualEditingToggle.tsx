"use client";

import { useEffect, useRef } from "react";

import type { Toggle } from "./toggle.js";

import { createToggle } from "./toggle.js";
import { useVisualEditing } from "./VisualEditingProvider.js";

export function VisualEditingToggle(): null {
  const { available, mode, setMode } = useVisualEditing();
  const toggle = useRef<Toggle | null>(null);

  useEffect(() => {
    if (!available) return;
    const created = createToggle(document, setMode);
    toggle.current = created;
    return () => {
      toggle.current = null;
      created.remove();
    };
  }, [available, setMode]);

  useEffect(() => {
    toggle.current?.show(mode);
  }, [available, mode]);

  return null;
}
