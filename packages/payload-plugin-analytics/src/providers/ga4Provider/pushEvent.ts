export function pushEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", name, params);
}
