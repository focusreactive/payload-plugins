"use client";

import { useEffect } from "react";
import { X, Clock, Copy } from "lucide-react";
import { EventTimeline } from "../ui/EventTimeline";
import { SetupRequiredCard } from "../ui/SetupRequiredCard";
import { SetupWarningIcon } from "../ui/SetupWarningIcon";
import { getDeviceIcon, LEAD_ACTION_LABELS } from "../icons";
import type { SessionDetailResponse, SessionsRow } from "../../../types/query";
import type { LeadActionKind } from "../../../types/events";

const LEAD_ACTION_EVENT_NAMES = new Set<string>([
  "phone_click",
  "email_click",
  "directions_click",
  "whatsapp_click",
  "telegram_click",
  "website_click",
  "booking_click",
  "form_submit",
]);

export interface SessionDrawerProps {
  row: SessionsRow & { leadKind?: LeadActionKind };
  detail?: SessionDetailResponse;
  onClose: () => void;
}

function shortId(id: string): string {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function SessionDrawer({ row, detail, onClose }: SessionDrawerProps) {
  const primaryDevice = row.deviceCategory[0] ?? "other";
  const Device = getDeviceIcon(primaryDevice);
  const fullSetupRequired = detail?.setupRequired && detail.missing?.includes("fr_session_id");
  const seqOnlyMissing = detail?.missing?.includes("fr_event_seq") && !detail?.missing?.includes("fr_session_id");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-[80] pa-animate-fade-in" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-0 right-0 bottom-0 w-[520px] max-w-full bg-[var(--theme-elevation-0)] shadow-drawer border-l border-[var(--theme-border-color)] z-[90] flex flex-col pa-animate-drawer-in">
        <div className="px-5 py-4 border-b border-[var(--theme-border-color)] flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-[var(--theme-elevation-1000)] font-[family-name:var(--font-mono)]">
              {shortId(row.sessionId)}
            </span>

            <button
              type="button"
              className="w-6 h-6 grid place-items-center text-[var(--theme-elevation-700)] hover:text-[var(--theme-elevation-1000)]"
              onClick={() => navigator.clipboard.writeText(row.sessionId)}
              title="Copy session id"
              aria-label="Copy session id">
              <Copy size={12} />
            </button>

            <button
              type="button"
              className="ml-auto w-8 h-8 grid place-items-center rounded-[var(--style-radius-s)] border border-[var(--theme-border-color)] hover:bg-[var(--theme-elevation-100)]"
              onClick={onClose}
              aria-label="Close"
              title="Close (Esc)">
              <X size={14} />
            </button>
          </div>

          <div className="text-xs text-[var(--theme-elevation-500)] flex gap-2.5 items-center flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock size={11} /> Started {row.startedAt}
            </span>

            <span>·</span>

            <span className="font-[family-name:var(--font-mono)]">{row.landingPage}</span>

            {seqOnlyMissing && <SetupWarningIcon missingKey="fr_event_seq" />}
          </div>
        </div>

        <div className="grid grid-cols-4 px-5 py-3.5 border-b border-[var(--theme-border-color)] bg-[var(--theme-elevation-50)]">
          <div>
            <div className="text-[10px] tracking-wider uppercase text-[var(--theme-elevation-500)] font-semibold">
              Events
            </div>

            <div className="text-base font-semibold text-[var(--theme-elevation-1000)] tabular-nums mt-0.5">
              {row.eventCount}
            </div>
          </div>

          <div>
            <div className="text-[10px] tracking-wider uppercase text-[var(--theme-elevation-500)] font-semibold">
              Device
            </div>

            <div className="text-base font-semibold text-[var(--theme-elevation-1000)] mt-0.5 inline-flex items-center gap-1.5">
              <Device size={15} />

              <span className="text-[13px]">{row.deviceCategory.join(", ")}</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] tracking-wider uppercase text-[var(--theme-elevation-500)] font-semibold">
              Country
            </div>

            <div className="text-base font-semibold text-[var(--theme-elevation-1000)] mt-0.5">{row.country.join(", ")}</div>
          </div>

          <div>
            <div className="text-[10px] tracking-wider uppercase text-[var(--theme-elevation-500)] font-semibold">
              Lead action
            </div>

            <div className="text-[13px] mt-0.5">
              {row.hadLeadAction && row.leadKind ?
                <span className="text-[var(--theme-success-700)]">{LEAD_ACTION_LABELS[row.leadKind]}</span>
              : row.hadLeadAction ?
                <span className="text-[var(--theme-success-700)]">Yes</span>
              : <span className="text-[var(--theme-elevation-500)]">—</span>}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--theme-elevation-500)] mb-3">
            Event timeline
          </div>

          {fullSetupRequired ?
            <SetupRequiredCard missingKeys={detail?.missing ?? ["fr_session_id"]} />
          : detail?.events.length ?
            <EventTimeline
              events={detail.events.map((e) => ({
                ...e,
                timestamp: e.timestamp.length > 5 ? e.timestamp.slice(11, 16) : e.timestamp,
                isLeadAction: LEAD_ACTION_EVENT_NAMES.has(e.eventName),
              }))}
            />
          : <div className="text-[var(--theme-elevation-500)] py-5 text-center">
              No events recorded for this session.
            </div>
          }
        </div>
      </div>
    </>
  );
}
