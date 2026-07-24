"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";

import { QuestionCircleIcon } from "../../lib/assets/icons/QuestionCircleIcon";

import styles from "./styles.module.scss";

type InfoPopoverProps = {
  /** The detail shown when the icon is activated. */
  content: ReactNode;
  /** Accessible name for the trigger button (the popover has no visible label). */
  label: string;
  /** Trigger glyph; defaults to a question mark. */
  icon?: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  /** Extra class on the trigger button (icon slot styling). */
  className?: string;
};

/**
 * A click/tap info affordance: an icon button that toggles a small popover with the detail. Replaces
 * hover-only tooltips for help text so it works on touch, is keyboard-operable, and never opens itself
 * when a surrounding popover autofocuses it (a Popover, unlike a Tooltip, does not open on focus). For
 * naming an icon *control*, use a Tooltip instead — this is for disclosing information.
 */
export default function InfoPopover({
  content,
  label,
  icon,
  side = "top",
  sideOffset = 6,
  className,
}: InfoPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={`${styles.trigger} ${className ?? ""}`} aria-label={label}>
          {icon ?? <QuestionCircleIcon />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.content}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={12}
        >
          {content}
          <Popover.Arrow className={styles.arrow} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
