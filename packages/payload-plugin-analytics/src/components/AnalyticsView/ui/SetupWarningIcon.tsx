import { AlertTriangle, ExternalLink } from "lucide-react";
import type { CustomRegistrationKey } from "../../../types/query";

const SETUP_COPY: Record<CustomRegistrationKey, string> = {
  fr_elapsed_ms:
    "Register `fr_elapsed_ms` as a custom metric (Standard, milliseconds) in GA4 Admin to enable this metric.",
  fr_session_id: "Register `fr_session_id` as a custom dimension in GA4 Admin to enable session-level analytics.",
  fr_event_seq: "Register `fr_event_seq` as a custom dimension to enable within-minute event ordering.",
  fr_session_start: "Register `fr_session_start` as an event-scoped custom dimension to populate session start time.",
  fr_lead_type: "Register `fr_lead_type` as an event-scoped custom dimension to track lead action types.",
};

const SETUP_GUIDE_URL =
  "https://github.com/focusreactive/payload-plugins/blob/main/packages/payload-plugin-analytics/docs/setup-ga4.md#stage-3-custom-registrations";

export function SetupWarningIcon({ missingKey }: { missingKey: CustomRegistrationKey }) {
  const copy = SETUP_COPY[missingKey];
  const parts = copy.split("`");
  return (
    <span
      role="img"
      aria-label="setup required"
      tabIndex={0}
      className="group relative inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[var(--theme-warning-50)] text-[var(--theme-warning-700)] border border-[var(--theme-warning-100)] cursor-help">
      <AlertTriangle size={10} />
      <span
        role="tooltip"
        className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 bg-[var(--theme-elevation-1000)] text-[var(--theme-elevation-0)] px-2.5 py-2 rounded-[var(--style-radius-s)] text-[11px] leading-snug w-[220px] text-left shadow-popover opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none transition-opacity z-30">
        {parts.map((seg, i) =>
          i % 2 ?
            <code
              key={i}
              className="font-[family-name:var(--font-mono)] bg-[var(--theme-elevation-700)] px-1 rounded text-[10px]">
              {seg}
            </code>
          : <span key={i}>{seg}</span>,
        )}
        <br />
        <a
          href={SETUP_GUIDE_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--theme-warning-500)] mt-1.5 inline-flex items-center gap-1 no-underline pointer-events-auto">
          Setup guide <ExternalLink size={10} />
        </a>
      </span>
    </span>
  );
}
