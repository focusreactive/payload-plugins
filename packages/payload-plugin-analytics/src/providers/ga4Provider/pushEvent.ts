import { SESSION_PARAM_KEYS } from "../../constants/session";
import { getSessionContext } from "../../client/session";

export function pushEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.gtag) return;

  const ctx = getSessionContext();

  window.gtag("event", name, {
    ...params,
    [SESSION_PARAM_KEYS.sessionId]: ctx.id,
    [SESSION_PARAM_KEYS.eventSeq]: ctx.eventSeq,
    [SESSION_PARAM_KEYS.elapsedMs]: ctx.elapsedMs,
    [SESSION_PARAM_KEYS.sessionStart]: ctx.startedAtIso,
  });
}
