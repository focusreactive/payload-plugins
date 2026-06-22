import type { HeaderNavItem } from "./ui/types";

import { I18N_CONFIG } from "@/core/config/i18n";

const LOCALE_CODES = new Set<string>(I18N_CONFIG.locales.map((locale) => locale.code));

function normalizePath(path: string): string {
  const [pathname = ""] = path.split(/[?#]/u);
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length > 0 && LOCALE_CODES.has(segments[0])) {
    segments.shift();
  }

  return segments.length > 0 ? `/${segments.join("/")}` : "/";
}

function isLinkActive(href: string, newTab: boolean | undefined, currentPath: string): boolean {
  if (newTab || !href.startsWith("/")) {
    return false;
  }

  const target = normalizePath(href);

  if (target === "/") {
    return currentPath === "/";
  }

  return currentPath === target || currentPath.startsWith(`${target}/`);
}

export function computeActiveNavItems(navItems: HeaderNavItem[], pathname: string): HeaderNavItem[] {
  const currentPath = normalizePath(pathname);

  return navItems.map((item) => {
    if (item.kind === "link") {
      return { ...item, active: isLinkActive(item.href, item.newTab, currentPath) };
    }

    const links = item.links.map((link) => ({
      ...link,
      active: isLinkActive(link.href, link.newTab, currentPath),
    }));

    return { ...item, links, active: links.some((link) => link.active) };
  });
}
