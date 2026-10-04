"use client";

import NextLink from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/components/utils";
import { Button } from "@/components/button";
import { ButtonSize, ButtonVariant } from "@/components/button/types";
import type { HeaderAction, HeaderNavItem } from "../types";
import { Chevron } from "./Chevron";

interface MobileNavProps {
  navItems: HeaderNavItem[];
  actions: HeaderAction[];
}

const rowClassName =
  "flex min-h-11 w-full items-center justify-between py-2 text-left text-[1rem] font-medium text-ct-dark-blue transition-colors duration-150 hover:text-ct-racing-green";

/** < 1024px (§6.6/6.9): green hamburger → 300px left drawer over a 60% grey-900 overlay. */
export function MobileNav({ navItems, actions }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelId = useId();
  const [mounted, setMounted] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // The header's backdrop-filter makes it the containing block for `position: fixed`, so the
  // overlay and drawer are portalled to <body>.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setExpanded(null);
  };

  const primaryAction = actions.find((action) => action.variant === ButtonVariant.Accent);
  const otherActions = actions.filter((action) => action !== primaryAction);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="inline-flex size-11 items-center justify-center rounded-md text-ct-green-500 transition-colors duration-150 hover:bg-ct-sand lg:hidden"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2.4" />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <>
            <div
              aria-hidden
              onClick={close}
              className={cn(
                "fixed inset-0 z-[110] bg-ct-grey-900/60 transition-opacity duration-200 lg:hidden",
                open ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            />

            <div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              inert={!open}
              className={cn(
                "fixed inset-y-0 left-0 z-[120] flex w-[300px] max-w-[85vw] flex-col bg-ct-white shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none lg:hidden",
                open ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <div className="flex h-16 items-center justify-end border-b border-ct-grey-300 px-4">
                <button
                  ref={closeRef}
                  type="button"
                  aria-label="Close menu"
                  onClick={() => {
                    close();
                    toggleRef.current?.focus();
                  }}
                  className="inline-flex size-11 items-center justify-center rounded-md text-ct-dark-blue hover:bg-ct-sand"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              </div>

              <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-3">
                <ul className="flex flex-col">
                  {navItems.map((item, index) => {
                    const itemKey = `${item.label}-${index}`;

                    if (item.kind === "link") {
                      return (
                        <li key={itemKey} className="border-b border-ct-grey-200">
                          <NextLink
                            href={item.href}
                            onClick={close}
                            aria-current={item.active ? "page" : undefined}
                            className={cn(rowClassName, item.active && "text-ct-racing-green")}
                            {...(item.newTab
                              ? { rel: "noopener noreferrer", target: "_blank" }
                              : {})}
                          >
                            {item.label}
                          </NextLink>
                        </li>
                      );
                    }

                    const isExpanded = expanded === itemKey;

                    return (
                      <li key={itemKey} className="border-b border-ct-grey-200">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpanded(isExpanded ? null : itemKey)}
                          className={cn(rowClassName, item.active && "text-ct-racing-green")}
                        >
                          {item.label}
                          <Chevron
                            className={cn(
                              "text-ct-slate-blue transition-transform duration-200 ease-out motion-reduce:transition-none",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                        {isExpanded && (
                          <ul className="flex flex-col pb-3 pl-3">
                            {item.links.map((link, linkIndex) => (
                              <li key={`${link.label}-${linkIndex}`}>
                                <NextLink
                                  href={link.href}
                                  onClick={close}
                                  aria-current={link.active ? "page" : undefined}
                                  className={cn(
                                    "flex min-h-11 items-center border-l-2 pl-3 text-[0.9375rem] transition-colors duration-150 hover:text-ct-racing-green",
                                    link.active
                                      ? "border-ct-racing-green text-ct-racing-green"
                                      : "border-ct-grey-200 text-ct-grey-900"
                                  )}
                                  {...(link.newTab
                                    ? { rel: "noopener noreferrer", target: "_blank" }
                                    : {})}
                                >
                                  {link.label}
                                </NextLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {otherActions.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1">
                    {otherActions.map((action, index) => (
                      <Button
                        key={`${action.label}-${index}`}
                        asChild
                        size={ButtonSize.Base}
                        variant={action.variant}
                        className="justify-start"
                      >
                        <NextLink href={action.href} onClick={close}>
                          {action.label}
                        </NextLink>
                      </Button>
                    ))}
                  </div>
                )}
              </nav>

              {primaryAction && (
                <div className="border-t border-ct-grey-300 p-5">
                  <Button
                    asChild
                    size={ButtonSize.Large}
                    variant={ButtonVariant.Accent}
                    className="w-full"
                  >
                    <NextLink href={primaryAction.href} onClick={close}>
                      {primaryAction.label}
                    </NextLink>
                  </Button>
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
