import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "../../../../utils";
import type { HeaderNavItem } from "../types";
import { Chevron } from "./Chevron";
import { DropdownContent } from "./DropdownContent";

interface DesktopNavProps {
  navItems: HeaderNavItem[];
}

const itemLinkClassName =
  "inline-flex items-center rounded-pill px-3.5 py-2 text-[0.95rem] font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-muted hover:text-foreground focus-visible:bg-surface-muted focus-visible:text-foreground focus-visible:outline-none";

const activeItemClassName = "font-bold text-foreground";

export function DesktopNav({ navItems }: DesktopNavProps) {
  return (
    <NavigationMenu.Root className="hidden items-center min-[860px]:flex" delayDuration={0}>
      <NavigationMenu.List className="flex list-none items-center gap-1">
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
                  "gap-1.5 data-[state=open]:bg-surface-muted data-[state=open]:text-foreground",
                  item.active && activeItemClassName
                )}
              >
                {item.label}
                <Chevron className="transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                className={cn(
                  "absolute left-0 top-full z-50 mt-3 rounded-lg border border-border bg-surface p-3.5 shadow-[0_30px_70px_-30px_rgba(10,19,20,0.42)]",
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
