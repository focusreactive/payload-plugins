import { SESSION_PARAM_KEYS } from "../../constants/session";
import { PAGE_PARAM_KEYS } from "../../constants/page";
import { getSessionContext } from "../../client/session";
import { getPageContext } from "../../client/pageContext/store";

export function pushEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.gtag) return;

  const ctx = getSessionContext();
  const page = getPageContext();

  window.gtag("event", name, {
    ...params,
    [SESSION_PARAM_KEYS.sessionId]: ctx.id,
    [SESSION_PARAM_KEYS.eventSeq]: ctx.eventSeq,
    [SESSION_PARAM_KEYS.elapsedMs]: ctx.elapsedMs,
    [SESSION_PARAM_KEYS.sessionStart]: ctx.startedAtIso,
    ...(page ? { [PAGE_PARAM_KEYS.pageRef]: page.pageRef, [PAGE_PARAM_KEYS.contentLocale]: page.locale } : {}),
  });
}
