import { FR_LEAD_TYPE_PARAM, LEAD_ACTION_EVENT_NAME } from "../../constants/events";
import type { LeadActionInstaller } from "./types";
import { shouldSkip } from "./shouldSkip";

export const installFormSubmit: LeadActionInstaller = (provider) => {
  const handler = (e: Event) => {
    const form = e.target as HTMLFormElement | null;

    if (!form || form.tagName !== "FORM") return;
    if (shouldSkip(form)) return;

    provider.trackEvent(LEAD_ACTION_EVENT_NAME, {
      [FR_LEAD_TYPE_PARAM]: "form_submit",
      form_id: form.id || undefined,
      form_name: form.getAttribute("name") || undefined,
      page_path: window.location.pathname + window.location.search,
    });
  };

  document.addEventListener("submit", handler, { capture: true });

  return () => document.removeEventListener("submit", handler, { capture: true });
};
