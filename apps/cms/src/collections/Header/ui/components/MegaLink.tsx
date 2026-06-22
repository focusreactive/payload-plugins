import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "@/components/utils";
import type { HeaderLink } from "../types";

interface MegaLinkProps {
  link: HeaderLink;
}

export function MegaLink({ link }: MegaLinkProps) {
  const newTabProps = link.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

  return (
    <NavigationMenu.Link active={link.active} asChild>
      <NextLink
        href={link.href}
        aria-current={link.active ? "page" : undefined}
        className={cn(
          "flex flex-col gap-[3px] rounded-sm px-[13px] py-[11px] transition-colors duration-150 hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
        )}
        {...newTabProps}
      >
        <span
          className={cn(
            "text-[0.92rem] font-semibold",
            link.active ? "text-primary" : "text-foreground"
          )}
        >
          {link.label}
        </span>
        {link.description && (
          <span className="text-[0.8rem] leading-[1.4] text-muted-foreground">
            {link.description}
          </span>
        )}
      </NextLink>
    </NavigationMenu.Link>
  );
}
