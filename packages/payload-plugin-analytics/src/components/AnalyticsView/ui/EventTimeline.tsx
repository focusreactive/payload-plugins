import type { SessionDetailEvent } from "../../../types/query";

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
  return (
    <div className="relative pl-[22px] before:content-[''] before:absolute before:left-2 before:top-1.5 before:bottom-1.5 before:w-px before:bg-[var(--theme-border-color)]">
      {events.map((event, i) => {
        const { eventName, timestamp, isLeadAction, params } = event;

        return (
          <div
            key={i}
            data-lead={isLeadAction ? "true" : undefined}
            className="relative grid grid-cols-[44px_1fr] gap-3 py-2 items-baseline">
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--theme-elevation-500)] text-right pr-1">
              {timestamp}
            </span>

            <span
              className={
                isLeadAction ?
                  "absolute -left-[22px] top-3 w-2.5 h-2.5 rounded-full bg-[var(--theme-success-500)] ring-1 ring-[var(--theme-success-200)] ring-offset-2 ring-offset-[var(--theme-elevation-0)]"
                : "absolute -left-[22px] top-3 w-2.5 h-2.5 rounded-full bg-[var(--theme-elevation-300)] ring-1 ring-[var(--theme-border-color)] ring-offset-2 ring-offset-[var(--theme-elevation-0)]"
              }
            />

            <div className="col-start-2 min-w-0">
              <span
                className={
                  isLeadAction ?
                    "text-sm font-semibold text-[var(--theme-success-700)]"
                  : "text-sm font-medium text-[var(--theme-elevation-900)]"
                }>
                {eventName}
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
