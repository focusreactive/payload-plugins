import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "@/components/utils";
import type { HeaderNavItem } from "../types";
import { Chevron } from "./Chevron";
import { DropdownContent } from "./DropdownContent";

interface DesktopNavProps {
  navItems: HeaderNavItem[];
}

// Untitled UI's own nav-link type scale, verbatim from
// shared/ui/shadcn/marketing/header-navigation/header.tsx. Only the type is theirs: the nav tree
// itself stays ours because it is driven by the CMS mega-nav data, which their static header has
// no equivalent for.
const itemLinkClassName =
  "flex cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-sm font-semibold text-secondary outline-focus-ring transition duration-100 ease-linear hover:text-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2";

const activeItemClassName = "text-brand-secondary";

export function DesktopNav({ navItems }: DesktopNavProps) {
  return (
    <NavigationMenu.Root className="hidden items-center min-[860px]:flex" delayDuration={0}>
      <NavigationMenu.List className="flex list-none items-center gap-0.5">
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
                  "absolute left-0 top-full z-50 mt-3 rounded-[4px] border border-border bg-surface p-3.5",
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
