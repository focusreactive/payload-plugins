"use client";

import { cn } from "@/components/utils";
import { Brand } from "./components/Brand";
import { DesktopNav } from "./components/DesktopNav";
import { HeaderActions } from "./components/HeaderActions";
import { MobileNav } from "./components/MobileNav";
import type { IHeaderProps } from "./types";

/**
 * A permanent hairline rule, not a blur that fades in on scroll: DESIGN.md bans glassmorphism
 * outright, and the rule is already this design's structural device for separating one thing
 * from another.
 */
export function Header({ brand, navItems, actions, className }: IHeaderProps) {
  return (
    <header
      className={cn("sticky left-0 top-0 z-[100] border-b border-border bg-background", className)}
    >
      <div className="mx-auto flex max-w-containerMaxW items-center justify-between gap-6 px-containerBase py-[15px]">
        <Brand brand={brand} />
        <DesktopNav navItems={navItems} />
        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-2.5 min-[860px]:flex">
            <HeaderActions actions={actions} />
          </div>
          <MobileNav navItems={navItems} actions={actions} />
        </div>
      </div>
    </header>
  );
}
