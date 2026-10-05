"use client";

import { clsx as cn } from "clsx";
import { useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// Portalled to the body: Payload's `Tooltip` sits inside what it describes, and any ancestor with
// `overflow` — a scrolling column, the join table — clips it there.
export const Tip = ({
  children,
  label,
  side = "top",
}: {
  children: ReactNode;
  label: string;
  side?: "left" | "top";
}) => {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const show = (event: { currentTarget: HTMLElement }) =>
    setAnchor(event.currentTarget.getBoundingClientRect());
  const hide = () => setAnchor(null);
  // Payload's caret is built to point down, so beside the anchor it is drawn by `--left` instead.
  const classes = cn(
    "tooltip",
    "tooltip--show",
    "tip-bubble",
    side === "top" ? "tooltip--caret-center tooltip--position-top" : "tip-bubble--left"
  );

  return (
    <span
      className="tip"
      onBlur={hide}
      onClick={hide}
      onFocus={show}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {anchor &&
        createPortal(
          <aside
            className={classes}
            // `--z-popup` is the one above `--z-modal`: portalled to the body, this is a sibling of
            // an open drawer, and the tooltip's own z-index of 3 would leave it underneath.
            style={
              side === "top"
                ? {
                    left: anchor.left + anchor.width / 2,
                    position: "fixed",
                    top: anchor.top - 6,
                    transform: "translate(-50%, -100%)",
                    zIndex: "var(--z-popup)",
                  }
                : {
                    left: anchor.left - 8,
                    position: "fixed",
                    top: anchor.top + anchor.height / 2,
                    transform: "translate(-100%, -50%)",
                    zIndex: "var(--z-popup)",
                  }
            }
          >
            <div className="tooltip-content">{label}</div>
          </aside>,
          document.body
        )}
    </span>
  );
};
