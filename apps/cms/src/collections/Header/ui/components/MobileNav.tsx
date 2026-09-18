"use client";

import NextLink from "next/link";
import { useEffect, useId, useState } from "react";

import { cn } from "@/components/utils";
import type { HeaderAction, HeaderNavItem } from "../types";
import { DESKTOP_NAV_HIDDEN } from "../constants";
import { Chevron } from "./Chevron";
import { HeaderActions } from "./HeaderActions";
import { IconButton } from "./IconButton";

interface MobileNavProps {
  navItems: HeaderNavItem[];
  actions: HeaderAction[];
}

const panelLinkClassName =
  "border-b border-border px-1 py-3 text-body-lg text-foreground transition-colors duration-[250ms] ease-[ease] hover:text-primary motion-reduce:transition-none";

export function MobileNav({ navItems, actions }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setExpanded(null);
  };

  return (
    <>
      <IconButton
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={DESKTOP_NAV_HIDDEN}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M2 4.5h14M2 9h14M2 13.5h14" />
        </svg>
      </IconButton>

      <div
        id={panelId}
        className={cn(
          "absolute left-0 top-full w-full bg-background px-containerBase overflow-hidden border-border border-t transition-[max-height,padding] duration-300 ease-out motion-reduce:transition-none",
          DESKTOP_NAV_HIDDEN,
          open ? "max-h-[60vh]" : "max-h-0"
        )}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1 pb-5 pt-2">
          {/* The call to action leads the panel because it is the one control the row had to drop. */}
          {actions.length > 0 && (
            <div className="mb-2 flex flex-col gap-2.5">
              <HeaderActions actions={actions} fullWidth onNavigate={close} />
            </div>
          )}

          {navItems.map((item, index) => {
            const itemKey = `${item.label}-${index}`;

            if (item.kind === "link") {
              const newTabProps = item.newTab
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {};

              return (
                <NextLink
                  key={itemKey}
                  href={item.href}
                  onClick={close}
                  aria-current={item.active ? "page" : undefined}
                  className={cn(panelLinkClassName, item.active && "text-primary")}
                  {...newTabProps}
                >
                  {item.label}
                </NextLink>
              );
            }

            const isExpanded = expanded === itemKey;

            return (
              <div key={itemKey} className="border-b border-border">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded(isExpanded ? null : itemKey)}
                  className={cn(
                    "flex w-full items-center justify-between px-1 py-3 text-left text-body-lg text-foreground transition-colors duration-[250ms] ease-[ease] hover:text-primary focus-visible:outline-none motion-reduce:transition-none",
                    item.active && "text-primary"
                  )}
                >
                  {item.label}
                  <Chevron
                    className={cn(
                      "transition-transform duration-200 ease-out motion-reduce:transition-none",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="flex flex-col gap-0.5 pb-2 pl-3">
                    {item.featured?.link && (
                      <NextLink
                        href={item.featured.link.href}
                        onClick={close}
                        className="py-2 text-small font-medium text-foreground hover:text-primary"
                        {...(item.featured.link.newTab
                          ? { rel: "noopener noreferrer", target: "_blank" }
                          : {})}
                      >
                        {item.featured.link.label}
                      </NextLink>
                    )}
                    {item.links.map((link, linkIndex) => {
                      const linkNewTabProps = link.newTab
                        ? { rel: "noopener noreferrer", target: "_blank" }
                        : {};

                      return (
                        <NextLink
                          key={`${link.label}-${linkIndex}`}
                          href={link.href}
                          onClick={close}
                          aria-current={link.active ? "page" : undefined}
                          className={cn(
                            "border-l-2 border-transparent py-2 pl-2 text-small transition-colors duration-[250ms] ease-[ease] hover:text-primary motion-reduce:transition-none",
                            link.active ? "border-primary text-primary" : "text-muted-foreground"
                          )}
                          {...linkNewTabProps}
                        >
                          {link.label}
                        </NextLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
