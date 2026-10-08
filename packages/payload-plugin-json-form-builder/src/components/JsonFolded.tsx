"use client";

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Collapsible } from "@payloadcms/ui";

type Props = Pick<
  ComponentProps<typeof Collapsible>,
  "actions" | "className" | "dragHandleProps" | "header" | "initCollapsed"
> & { children: ReactNode };

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
