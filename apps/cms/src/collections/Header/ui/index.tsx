"use client";

import { useEffect, useState } from "react";

import { cn } from "@/components/utils";
import { Brand } from "./components/Brand";
import { DesktopNav } from "./components/DesktopNav";
import { HeaderActions } from "./components/HeaderActions";
import { MobileNav } from "./components/MobileNav";
import type { IHeaderProps } from "./types";

const SCROLL_THRESHOLD_PX = 8;

export function Header({ brand, navItems, actions, className }: IHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky left-0 top-0 z-[100] bg-background/[0.82] backdrop-blur-[14px] backdrop-saturate-[1.4] transition-[background-color,border-color] duration-200 ease-out motion-reduce:transition-none",
        scrolled ? "border-b border-border" : "border-b border-transparent",
        className
      )}
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
