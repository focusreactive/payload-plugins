"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 250;

export const useHiddenLevelsMenu = (hasHiddenLevels: boolean) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);
  const [isOpen, setIsOpen] = useState(false);

  const setOpenAfter = useCallback((next: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIsOpen(next), delay);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!hasHiddenLevels) {
      setIsOpen(false);
    }
  }, [hasHiddenLevels]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !toggleRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    // Capture phase on window, ahead of faceless-ui's document listener that would close the panel.
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [isOpen]);

  return {
    isOpen,
    menuRef,
    toggleRef,
    close: () => setIsOpen(false),
    toggle: () => {
      window.clearTimeout(timer.current);
      setIsOpen((previous) => !previous);
    },
    hoverOpen: () => setOpenAfter(true, OPEN_DELAY_MS),
    hoverKeepOpen: () => setOpenAfter(true, 0),
    hoverClose: () => setOpenAfter(false, CLOSE_DELAY_MS),
  };
};
