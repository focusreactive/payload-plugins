import { TRAFFIC_EVENTS } from "../../constants/events";
import { SESSION_PARAM_KEYS } from "../../constants/session";
import { PAGE_PARAM_KEYS } from "../../constants/page";
import { getSessionContext } from "../../client/session";
import { getPageContext } from "../../client/pageContext/store";

export function pushPageView(path: string, title: string, location: string): void {
  if (typeof window === "undefined" || !window.gtag) return;

  const ctx = getSessionContext();
  const page = getPageContext();

  window.gtag("event", TRAFFIC_EVENTS.PAGE_VIEW, {
    page_path: path,
    page_title: title,
    page_location: location,
    [SESSION_PARAM_KEYS.sessionId]: ctx.id,
    [SESSION_PARAM_KEYS.eventSeq]: ctx.eventSeq,
    [SESSION_PARAM_KEYS.elapsedMs]: ctx.elapsedMs,
    [SESSION_PARAM_KEYS.sessionStart]: ctx.startedAtIso,
    ...(page ? { [PAGE_PARAM_KEYS.pageRef]: page.pageRef, [PAGE_PARAM_KEYS.contentLocale]: page.locale } : {}),
  });
}
