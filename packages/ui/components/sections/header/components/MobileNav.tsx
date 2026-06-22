"use client";

import NextLink from "next/link";
import { useEffect, useId, useState } from "react";

import { cn } from "../../../../utils";
import { Button } from "../../../ui/button";
import { ButtonSize, ButtonVariant } from "../../../ui/button/types";
import type { HeaderAction, HeaderNavItem } from "../types";
import { Chevron } from "./Chevron";

interface MobileNavProps {
  navItems: HeaderNavItem[];
  actions: HeaderAction[];
}

const panelLinkClassName =
  "border-b border-border px-1 py-3 text-[1.05rem] text-foreground transition-colors duration-150 hover:text-primary";

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
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center justify-center rounded-sm p-1 text-foreground transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[860px]:hidden"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div
        id={panelId}
        className={cn(
          "absolute left-0 top-full w-full bg-background px-containerBase overflow-hidden border-border border-t transition-[max-height,padding] duration-300 ease-out motion-reduce:transition-none min-[860px]:hidden",
          open ? "max-h-[60vh]" : "max-h-0"
        )}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1 pb-5 pt-2">
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
                  className={cn(panelLinkClassName, item.active && "font-bold")}
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
                    "flex w-full items-center justify-between px-1 py-3 text-left text-[1.05rem] text-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-none",
                    item.active && "font-bold"
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
                        className="py-2 text-[0.95rem] font-semibold text-foreground hover:text-primary"
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
                            "border-l-2 border-transparent py-2 pl-2 text-[0.95rem] transition-colors duration-150 hover:text-primary",
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

          <div className="mt-3 flex flex-row flex-wrap gap-2.5">
            {actions.map((action, index) => {
              const newTabProps = action.newTab
                ? { rel: "noopener noreferrer", target: "_blank" }
                : {};

              return (
                <Button
                  key={`${action.label}-${index}`}
                  asChild
                  size={ButtonSize.Small}
                  variant={action.variant}
                >
                  <NextLink href={action.href} onClick={close} {...newTabProps}>
                    {action.label}
                    {action.variant === ButtonVariant.Accent && <span aria-hidden>&rarr;</span>}
                  </NextLink>
                </Button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
