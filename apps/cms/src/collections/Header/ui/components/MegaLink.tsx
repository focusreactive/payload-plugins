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
        className="group flex flex-col gap-1 rounded-md px-3 py-2.5 transition-colors duration-150 hover:bg-ct-white focus-visible:bg-ct-white"
        {...newTabProps}
      >
        <span
          className={cn(
            "text-[0.9375rem] font-semibold underline-offset-[3px] group-hover:underline",
            link.active ? "text-ct-racing-green" : "text-ct-dark-blue"
          )}
        >
          {link.label}
        </span>
        {link.description && (
          <span className="text-[0.8125rem] leading-[1.45] text-ct-grey-700">
            {link.description}
          </span>
        )}
      </NextLink>
    </NavigationMenu.Link>
  );
}
