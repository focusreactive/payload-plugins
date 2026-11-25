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
          "flex flex-col gap-1 rounded-lg px-4 py-3 transition-colors duration-150 hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
        )}
        {...newTabProps}
      >
        <span
          className={cn(
            "text-body font-semibold text-foreground",
            link.active && "underline decoration-white-40 underline-offset-4"
          )}
        >
          {link.label}
        </span>
        {link.description && (
          <span className="text-small text-muted-foreground">{link.description}</span>
        )}
      </NextLink>
    </NavigationMenu.Link>
  );
}
