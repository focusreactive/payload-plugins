import { LEAD_ACTION_EVENTS } from "../../constants/events";
import type { LeadActionInstaller } from "./types";
import { shouldSkip } from "./shouldSkip";

export const installPhoneClick: LeadActionInstaller = (provider) => {
  const handler = (e: Event) => {
    const target = e.target as Element | null;
    const anchor = target?.closest('a[href^="tel:"]') as HTMLAnchorElement | null;

    if (!anchor) return;
    if (shouldSkip(anchor)) return;

    provider.trackEvent(LEAD_ACTION_EVENTS.PHONE_CLICK, {
      link_url: anchor.href,
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
    });
  };

  document.addEventListener("click", handler, { capture: true });

  return () => document.removeEventListener("click", handler, { capture: true });
};
