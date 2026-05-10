import { TRAFFIC_EVENTS } from "../../constants/events";

export function pushPageView(path: string, title: string, location: string): void {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", TRAFFIC_EVENTS.PAGE_VIEW, {
    page_path: path,
    page_title: title,
    page_location: location,
  });
}
