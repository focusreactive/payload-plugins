import { AlertTriangle, ExternalLink } from "lucide-react";
import type { CustomRegistrationKey } from "../../../types/query";

const KEY_COPY: Record<CustomRegistrationKey, string> = {
  fr_session_id: "Register `fr_session_id` as a custom dimension (event-scoped) in GA4 Admin.",
  fr_event_seq: "Register `fr_event_seq` as a custom dimension to enable within-minute ordering.",
  fr_elapsed_ms: "Register `fr_elapsed_ms` as a Standard custom metric (Milliseconds) in GA4 Admin.",
  fr_session_start: "Register `fr_session_start` as a custom dimension (event-scoped) in GA4 Admin.",
};

const SETUP_GUIDE_URL =
  "https://github.com/focusreactive/payload-plugins/blob/main/packages/payload-plugin-analytics/docs/setup-ga4.md#stage-3-custom-registrations";

export interface SetupRequiredCardProps {
  missingKeys: CustomRegistrationKey[];
}

function renderInlineCode(line: string) {
  return line.split("`").map((seg, i) =>
    i % 2 ?
      <code
        key={i}
        className="font-[family-name:var(--font-mono)] bg-[var(--theme-warning-100)] px-1.5 rounded text-[11px]">
        {seg}
      </code>
    : <span key={i}>{seg}</span>,
  );
}

export function SetupRequiredCard({ missingKeys }: SetupRequiredCardProps) {
  return (
    <div className="border border-dashed border-[var(--theme-warning-500)] bg-[var(--theme-warning-50)] rounded-[var(--style-radius-m)] p-5">
      <div className="flex items-center gap-2 font-semibold text-[var(--theme-warning-700)] mb-2">
        <AlertTriangle size={16} />
        <span>Setup required</span>
      </div>
      <div className="text-[var(--theme-warning-700)] text-sm leading-relaxed">
        <ul className="my-2 pl-5 list-disc">
          {missingKeys.map((k) => (
            <li key={k} className="mb-1">
              {renderInlineCode(KEY_COPY[k])}
            </li>
          ))}
        </ul>
        <a
          href={SETUP_GUIDE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[var(--theme-warning-700)] mt-2">
          Setup guide <ExternalLink size={12} />
        </a>
        <p className="mt-2 text-[12.5px] text-[var(--theme-warning-700)]/80">
          After registering, GA4 takes up to 24 hours to backfill data.
        </p>
      </div>
    </div>
  );
}
