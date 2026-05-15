import * as Popover from "@radix-ui/react-popover";
import type { PropsWithChildren, ReactElement } from "react";

import style from "./styles.module.scss";

type PopupProps = PropsWithChildren<{
  $trigger: ReactElement;
  $align?: "center" | "end" | "start";
  $side?: "top" | "right" | "bottom" | "left";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

function Popup({
  open,
  children,
  onOpenChange,
  $trigger,
  $align,
  $side,
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
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default Popup;
