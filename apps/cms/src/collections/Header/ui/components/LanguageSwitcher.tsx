"use client";

import { ChevronDown, Globe01 } from "@untitledui/icons";
import { useLocale } from "next-intl";
import React, { useEffect, useRef, useState } from "react";

import { usePathname } from "@/lib/i18n/navigation";
import { I18N_CONFIG } from "@/lib/config/i18n";

const NATIVE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  ja: "日本語",
  ko: "한국어",
  "zh-hans": "简体中文",
  "zh-hant": "繁體中文",
};

/**
 * Offers only the languages this page is actually translated into. The list comes from the
 * page's own hreflang links, which the path map writes only for locales that have a real
 * translation, so a missing language shows as unavailable instead of switching to a fallback.
 * Reading them from the DOM also gives each language its own localised address: the same page is
 * /global-presence/... in English and /ja/世界展開/... in Japanese, so swapping the prefix would 404.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [alternates, setAlternates] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const readAlternates = () => {
      const next: Record<string, string> = {};
      document.head
        .querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')
        .forEach((link) => {
          const hreflang = link.getAttribute("hreflang")?.toLowerCase();
          if (hreflang && hreflang !== "x-default") next[hreflang] = link.href;
        });
      setAlternates(next);
    };
    readAlternates();
    // Client navigation swaps the head's metadata after the pathname changes.
    const observer = new MutationObserver(readAlternates);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-tertiary ring-1 ring-secondary_alt transition hover:bg-surface-raised hover:text-primary"
      >
        <Globe01 className="size-4" />
        {NATIVE_LABELS[locale] ?? locale}
        <ChevronDown className="size-4" />
      </button>
      {isOpen && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg bg-surface-raised py-1 shadow-lg ring-1 ring-secondary_alt"
        >
          {I18N_CONFIG.locales.map(({ code }) => {
            const href = alternates[code];
            const isCurrent = code === locale;
            return (
              <li key={code} role="none">
                {href && !isCurrent ? (
                  <a
                    role="menuitem"
                    href={href}
                    className="flex items-center justify-between px-3.5 py-2.5 text-sm font-medium text-primary hover:bg-bg-secondary"
                  >
                    {NATIVE_LABELS[code] ?? code}
                  </a>
                ) : (
                  <span
                    role="menuitem"
                    aria-disabled="true"
                    className={`flex items-center justify-between px-3.5 py-2.5 text-sm ${
                      isCurrent ? "font-semibold text-brand-secondary" : "text-quaternary"
                    }`}
                  >
                    {NATIVE_LABELS[code] ?? code}
                    {!isCurrent && <span className="text-xs">Not translated</span>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
