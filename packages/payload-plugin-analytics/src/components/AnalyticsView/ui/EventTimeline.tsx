"use client";

import { useLeadActionRegistry } from "../contexts/LeadActionRegistryContext";
import type { SessionDetailEvent } from "../../../types/query";
import { cn } from "../../../utils/style";

export interface TimelineEvent extends SessionDetailEvent {
  isLeadAction?: boolean;
}

export interface EventTimelineProps {
  events: TimelineEvent[];
}

function pickDetail({ pagePath, params }: TimelineEvent) {
  if (pagePath) return pagePath;

  const p = params ?? {};

  return (p.scroll_depth as string) ?? (p.link_url as string) ?? undefined;
}

export function EventTimeline({ events }: EventTimelineProps) {
  const { resolveLabel } = useLeadActionRegistry();
  const eventCount = events.length;

  return (
    <div className="grid gap-4">
      {events.map((event, i) => {
        const { eventName, timestamp, isLeadAction, params } = event;
        const isFirst = i === 0;
        const isLast = i === events.length - 1;
        const leadType =
          isLeadAction && typeof params?.fr_lead_type === "string" ? (params.fr_lead_type as string) : undefined;
        const primaryLabel = isLeadAction && leadType ? `Lead action: ${resolveLabel(leadType)}` : eventName;

        return (
          <div
            key={i}
            data-lead={isLeadAction ? "true" : undefined}
            className="grid grid-cols-[auto_10px_1fr] gap-3 items-baseline">
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-(--theme-elevation-500) text-right">
              {timestamp}
            </span>

            <div className="relative self-stretch">
              {!isFirst && eventCount && (
                <span className="absolute top-0 bottom-1/2 left-1/2 -translate-x-1/2 w-px bg-(--theme-border-color)" />
              )}
              {!isLast && eventCount && (
                <span className="absolute top-1/2 -bottom-4 left-1/2 -translate-x-1/2 w-px bg-(--theme-border-color)" />
              )}
              <span
                className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-1 ring-offset-2 ring-offset-(--theme-elevation-0)",
                  isLeadAction ?
                    "bg-(--theme-success-500) ring-(--theme-success-200)"
                  : "bg-(--theme-elevation-300) ring-(--theme-border-color)",
                )}
              />
            </div>

            <div className="min-w-0">
              <span
                className={
                  isLeadAction ?
                    "text-sm font-semibold text-[var(--theme-success-700)]"
                  : "text-sm font-medium text-[var(--theme-elevation-900)]"
                }>
                {primaryLabel}
              </span>
              {pickDetail(event) && (
                <span className="text-xs text-[var(--theme-elevation-500)] ml-2 font-[family-name:var(--font-mono)]">
                  {pickDetail(event)}
                </span>
              )}
              {params && Object.keys(params).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(params).map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[10px] font-[family-name:var(--font-mono)] px-1.5 py-px bg-[var(--theme-elevation-100)] rounded text-[var(--theme-elevation-700)]">
                      <b className="text-[var(--theme-elevation-500)] font-normal">{k}:</b> {String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
