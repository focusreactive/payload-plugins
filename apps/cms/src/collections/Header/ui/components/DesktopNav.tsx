import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "@/components/utils";
import type { HeaderNavItem } from "../types";
import { Chevron } from "./Chevron";
import { DropdownContent } from "./DropdownContent";

interface DesktopNavProps {
  navItems: HeaderNavItem[];
}

// §6.6: 15px/500 grey-900, hover = 2px green-500 underline drawn with an inset shadow (as on the
// live site), active = 3px.
const itemLinkClassName =
  "inline-flex min-h-11 items-center px-3 text-[0.9375rem] font-medium text-ct-grey-900 transition-[box-shadow,color] duration-150 hover:shadow-[inset_0_-2px_0_var(--color-ct-green-500)] focus-visible:shadow-[inset_0_-2px_0_var(--color-ct-green-500)]";

const activeItemClassName = "shadow-[inset_0_-3px_0_var(--color-ct-green-500)] text-ct-dark-blue";

export function DesktopNav({ navItems }: DesktopNavProps) {
  return (
    <NavigationMenu.Root
      aria-label="Main"
      className="relative hidden h-full items-center lg:flex"
      delayDuration={0}
    >
      <NavigationMenu.List className="flex h-full list-none items-center gap-0.5">
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
            <NavigationMenu.Item key={`${item.label}-${index}`}>
              <NavigationMenu.Trigger
                className={cn(
                  "group gap-1.5",
                  itemLinkClassName,
                  "data-[state=open]:shadow-[inset_0_-2px_0_var(--color-ct-green-500)]",
                  item.active && activeItemClassName
                )}
              >
                {item.label}
                <Chevron className="text-ct-slate-blue transition-transform duration-200 ease-out group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                className={cn(
                  "absolute left-1/2 top-full z-50 mt-3 -translate-x-1/2 rounded-lg border border-ct-grey-300 bg-ct-sand p-4 shadow-[0_24px_60px_-30px_rgba(18,72,83,0.45)]",
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
