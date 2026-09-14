"use client";

import { useEffect, useState } from "react";

import { cn } from "@/components/utils";
import { Brand } from "./components/Brand";
import { CartButton } from "./components/CartButton";
import { DesktopNav } from "./components/DesktopNav";
import { HeaderActions } from "./components/HeaderActions";
import { MobileNav } from "./components/MobileNav";
import { SearchButton } from "./components/SearchButton";
import { DESKTOP_NAV_VISIBLE } from "./constants";
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
        "sticky left-0 top-0 z-[100] bg-background transition-[background-color,border-color] duration-200 ease-out motion-reduce:transition-none",
        scrolled ? "border-b border-border" : "border-b border-transparent",
        className
      )}
    >
      <div className="mx-auto flex min-h-[clamp(60px,7vh,96px)] max-w-containerMaxW flex-wrap items-center justify-between gap-[clamp(12px,2vw,40px)] px-containerBase py-[clamp(12px,1.5vh,18px)]">
        <Brand brand={brand} />
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-[clamp(2px,0.4vw,8px)]">
          <DesktopNav navItems={navItems} />
          {/* Below the desktop width the search and cart squares stay: they are the shop
              affordance, and burying them in the panel costs more than the row gains. */}
          <div className="flex items-center gap-[clamp(8px,1vw,12px)] sm:ml-[clamp(6px,1.4vw,20px)]">
            <SearchButton />
            <div
              className={cn("hidden items-center gap-[clamp(8px,1vw,12px)]", DESKTOP_NAV_VISIBLE)}
            >
              <HeaderActions actions={actions} />
            </div>
            <CartButton />
            <MobileNav navItems={navItems} actions={actions} />
          </div>
        </div>
      </div>
    </header>
  );
}
