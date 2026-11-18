"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import styles from "./styles.module.scss";

type SideDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** The id of the element that names the drawer, usually its heading. */
  labelledBy: string;
  children: ReactNode;
};

/**
 * A panel sliding in from the right edge, over a backdrop. Rendered on `document.body`, so it sits
 * outside Payload's document form wherever its trigger lives.
 */
export default function SideDrawer({ open, onClose, labelledBy, children }: SideDrawerProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.root}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
