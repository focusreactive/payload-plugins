import { LEAD_ACTION_EVENTS } from "../../constants/events";
import type { LeadActionInstaller } from "./types";
import { shouldSkip } from "./shouldSkip";

const DIRECTIONS_HOSTS = new Set(["google.com", "www.google.com", "goo.gl", "maps.app.goo.gl"]);
const DIRECTIONS_PATH_RE = /\/maps(\/|$)/;

function isDirectionsLink(href: string) {
  try {
    const url = new URL(href);

    if (url.host === "maps.app.goo.gl") return true;
    if (url.host === "goo.gl" && DIRECTIONS_PATH_RE.test(url.pathname)) return true;
    if (DIRECTIONS_HOSTS.has(url.host) && DIRECTIONS_PATH_RE.test(url.pathname)) return true;

    return false;
  } catch {
    return false;
  }
}

export const installDirectionsClick: LeadActionInstaller = (provider) => {
  const handler = (e: Event) => {
    const target = e.target as Element | null;
    const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

    if (!anchor) return;
    if (!isDirectionsLink(anchor.href)) return;
    if (shouldSkip(anchor)) return;

    provider.trackEvent(LEAD_ACTION_EVENTS.DIRECTIONS_CLICK, {
      link_url: anchor.href,
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
    });
  };

  document.addEventListener("click", handler, { capture: true });

  return () => document.removeEventListener("click", handler, { capture: true });
};
