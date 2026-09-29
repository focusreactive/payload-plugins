import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "@/components/utils";
import type { HeaderNavItem } from "../types";
import { DESKTOP_NAV_VISIBLE } from "../constants";
import { Chevron } from "./Chevron";
import { DropdownContent } from "./DropdownContent";

interface DesktopNavProps {
  navItems: HeaderNavItem[];
}

const itemLinkClassName =
  "inline-flex h-[clamp(40px,3.4vw,46px)] items-center whitespace-nowrap rounded-lg px-[clamp(6px,0.8vw,12px)] text-small font-medium text-foreground transition-colors duration-[250ms] ease-[ease] hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none motion-reduce:transition-none";

/** The design draws no active state, so the current page simply keeps the mint ground hover gives. */
const activeItemClassName = "bg-surface-muted";

export function DesktopNav({ navItems }: DesktopNavProps) {
  return (
    <NavigationMenu.Root
      className={cn("hidden items-center", DESKTOP_NAV_VISIBLE)}
      delayDuration={0}
    >
      <NavigationMenu.List className="flex list-none items-center gap-[clamp(2px,0.4vw,8px)]">
        {navItems.map((item, index) => {
          if (item.kind === "link") {
            const newTabProps = item.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

            return (
              <NavigationMenu.Item key={`${item.label}-${index}`}>
                <NavigationMenu.Link active={item.active} asChild>
                  <NextLink
                    href={item.href}
                    className={cn(itemLinkClassName, item.active && activeItemClassName)}
                    aria-current={item.active ? "page" : undefined}
                    {...newTabProps}
                  >
                    {item.label}
                  </NextLink>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            );
          }

          return (
            <NavigationMenu.Item key={`${item.label}-${index}`} className="relative">
              <NavigationMenu.Trigger
                className={cn(
                  "group",
                  itemLinkClassName,
                  "gap-[5px] data-[state=open]:bg-surface-muted",
                  item.active && activeItemClassName
                )}
              >
                {item.label}
                <Chevron className="transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                className={cn(
                  "absolute left-0 top-full z-50 mt-3 rounded-lg border border-border bg-surface p-3.5 shadow-float",
                  "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out motion-reduce:animate-none"
                )}
              >
                <DropdownContent item={item} />
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          );
        })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
