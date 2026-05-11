import { TRAFFIC_EVENTS } from "../../constants/events";
import { SESSION_PARAM_KEYS } from "../../constants/session";
import { getSessionContext } from "../../client/session";

export function pushPageView(path: string, title: string, location: string): void {
  if (typeof window === "undefined" || !window.gtag) return;

  const ctx = getSessionContext();

  window.gtag("event", TRAFFIC_EVENTS.PAGE_VIEW, {
    page_path: path,
    page_title: title,
    page_location: location,
    [SESSION_PARAM_KEYS.sessionId]: ctx.id,
    [SESSION_PARAM_KEYS.eventSeq]: ctx.eventSeq,
    [SESSION_PARAM_KEYS.elapsedMs]: ctx.elapsedMs,
  });
}
