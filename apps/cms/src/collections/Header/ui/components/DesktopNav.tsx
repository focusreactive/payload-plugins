import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "@/components/utils";
import type { HeaderNavItem } from "../types";
import { Chevron } from "./Chevron";
import { DropdownContent } from "./DropdownContent";

interface DesktopNavProps {
  navItems: HeaderNavItem[];
}

const itemLinkClassName =
  "inline-flex items-center text-small font-medium capitalize text-foreground transition-opacity duration-150 hover:opacity-70 focus-visible:opacity-70 focus-visible:outline-none";

const activeItemClassName = "underline decoration-white-40 underline-offset-8";

export function DesktopNav({ navItems }: DesktopNavProps) {
  return (
    <NavigationMenu.Root
      className="relative hidden items-center justify-center min-[860px]:flex"
      delayDuration={0}
    >
      <NavigationMenu.List className="flex list-none items-center gap-6">
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
                  "gap-1 data-[state=open]:opacity-70",
                  item.active && activeItemClassName
                )}
              >
                {item.label}
                <Chevron className="transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                className={cn(
                  "absolute left-0 top-full z-50 mt-5 rounded-xl border border-border bg-popover p-2 shadow-popover",
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
