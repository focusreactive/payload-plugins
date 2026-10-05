"use client";

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Collapsible } from "@payloadcms/ui";

type Props = Pick<
  ComponentProps<typeof Collapsible>,
  "actions" | "className" | "dragHandleProps" | "header" | "initCollapsed"
> & { children: ReactNode };

// Payload's Collapsible renders a closed accordion's contents at height 0, so the whole value —
// every section, every row, a Lexical editor per rich text — would mount before anything is opened.
// A section waits for its first opening and then keeps what it mounted; inside it everything is
// eager again, so an accordion nested in an open section has nothing left to load.
export const JsonFolded = ({ children, ...props }: Props) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);

  return (
    <Collapsible {...props} isCollapsed={!open} onToggle={(collapsed) => setOpen(!collapsed)}>
      {mounted ? children : null}
    </Collapsible>
  );
};
