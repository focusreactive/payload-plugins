import * as Popover from "@radix-ui/react-popover";
import type { PropsWithChildren, ReactElement } from "react";

import style from "./styles.module.scss";

type PopupProps = PropsWithChildren<{
  $trigger: ReactElement;
  $align?: "center" | "end" | "start";
  $side?: "top" | "right" | "bottom" | "left";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Forwarded to Radix `Popover.Content`. Call `event.preventDefault()` to stop the popover
   * from auto-focusing its first focusable child on open — useful when that child is a
   * tooltip trigger (Radix tooltips open on focus, so autofocus would flash the tooltip).
   */
  onOpenAutoFocus?: (event: Event) => void;
}>;

function Popup({
  open,
  children,
  onOpenChange,
  $trigger,
  $align,
  $side,
  onOpenAutoFocus,
}: PopupProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{$trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          side={$side}
          align={$align}
          className={style.popover}
          onOpenAutoFocus={onOpenAutoFocus}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default Popup;
