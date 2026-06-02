import { FR_LEAD_TYPE_PARAM, LEAD_ACTION_EVENT_NAME } from "../../constants/events";
import type { LeadActionInstaller } from "./types";
import { shouldSkip } from "./shouldSkip";

const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com"]);
const TELEGRAM_HOSTS = new Set(["t.me", "telegram.me"]);

type Kind = "whatsapp" | "telegram" | null;

function classify(href: string): Kind {
  try {
    const { host } = new URL(href);

    if (WHATSAPP_HOSTS.has(host)) return "whatsapp";
    if (TELEGRAM_HOSTS.has(host)) return "telegram";

    return null;
  } catch {
    return null;
  }
}

function makeInstaller(kind: "whatsapp" | "telegram"): LeadActionInstaller {
  const leadType = kind === "whatsapp" ? "whatsapp_click" : "telegram_click";

  return (provider) => {
    const handler = (e: Event) => {
      const target = e.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) return;
      if (classify(anchor.href) !== kind) return;
      if (shouldSkip(anchor)) return;

      provider.trackEvent(LEAD_ACTION_EVENT_NAME, {
        [FR_LEAD_TYPE_PARAM]: leadType,
        link_url: anchor.href,
        page_path: window.location.pathname + window.location.search,
        page_title: document.title,
      });
    };

    document.addEventListener("click", handler, { capture: true });

    return () => document.removeEventListener("click", handler, { capture: true });
  };
}

export const installWhatsappClick = makeInstaller("whatsapp");
export const installTelegramClick = makeInstaller("telegram");
