"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CaveatBanner } from "../ui/CaveatBanner";
import { SetupRequiredCard } from "../ui/SetupRequiredCard";
import { SkeletonBlock } from "../ui/SkeletonBlock";
import { ErrorTile } from "../ui/ErrorTile";
import { EmptyTile } from "../ui/EmptyTile";
import { SessionsFilters } from "./SessionsFilters";
import { SessionDrawer } from "./SessionDrawer";
import { getDeviceIcon, getLeadActionIcon, LEAD_ACTION_LABELS } from "../icons";
import { cn } from "../../../utils/style";
import { formatNumber } from "../numberFormatters";
import type { SessionDetailResponse, SessionsResponse, SessionsRow } from "../../../types/query";
import type { SessionsFilters as Filters } from "../hooks/useAnalyticsParams";
import type { LeadActionKind } from "../../../types/events";

export interface SessionsTabProps {
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  sessions?: SessionsResponse;
  fetchDetail?: (sessionId: string) => Promise<SessionDetailResponse>;
  loading?: boolean;
  error?: Error;
  onLoadMore?: () => void;
}

type SessionsRowWithLead = SessionsRow & { leadKind?: LeadActionKind };

export function SessionsTab({
  filters,
  onFiltersChange,
  sessions,
  fetchDetail,
  loading,
  error,
  onLoadMore,
}: SessionsTabProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetailResponse | undefined>();

  const rows = (sessions?.rows ?? []) as SessionsRowWithLead[];
  const sourceOptions = useMemo(() => [...new Set(rows.map((r) => r.source))], [rows]);
  const countryOptions = useMemo(() => [...new Set(rows.map((r) => r.country))], [rows]);

  async function openRow(sessionId: string) {
    setOpenId(sessionId);

    if (fetchDetail) {
      const d = await fetchDetail(sessionId);
      setDetail(d);
    }
  }

  return (
    <div>
      <CaveatBanner>
        <b>Times shown at minute precision.</b> Order within the same minute is approximate. This is a permanent
        limitation of the GA4 Data API path.
      </CaveatBanner>

      <SessionsFilters
        filters={filters}
        onChange={onFiltersChange}
        sourceOptions={sourceOptions}
        countryOptions={countryOptions}
      />

      {sessions?.setupRequired ?
        <SetupRequiredCard missingKeys={sessions.missing ?? ["fr_session_id"]} />
      : <div className="bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] overflow-hidden">
          {loading ?
            <div className="p-4">
              <SkeletonBlock shape="table" rows={6} />
            </div>
          : error ?
            <ErrorTile error={error} />
          : rows.length === 0 ?
            <EmptyTile message="No sessions matched these filters." />
          : <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]"
                    style={{ width: 80 }}>
                    Started
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Landing page
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Source
                  </th>

                  <th
                    className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]"
                    style={{ width: 60 }}>
                    Dev
                  </th>

                  <th
                    className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]"
                    style={{ width: 50 }}>
                    Cnt
                  </th>

                  <th
                    className="text-right text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]"
                    style={{ width: 50 }}>
                    Evt
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Lead
                  </th>

                  <th
                    className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]"
                    style={{ width: 30 }}
                  />
                </tr>
              </thead>

              <tbody>
                {rows.map((s) => {
                  const Device = getDeviceIcon(s.deviceCategory);
                  const isSelected = openId === s.sessionId;
                  const leadKind = s.leadKind;
                  const Lead = leadKind ? getLeadActionIcon(leadKind) : null;

                  return (
                    <tr
                      key={s.sessionId}
                      onClick={() => openRow(s.sessionId)}
                      className={cn(
                        "cursor-pointer hover:bg-[var(--theme-elevation-50)] text-[12.5px]",
                        isSelected && "bg-[var(--theme-elevation-100)]",
                      )}>
                      <td className="p-3 border-b border-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-[11.5px]">
                        {s.startedAt.length > 5 ? s.startedAt.slice(11, 16) : s.startedAt}
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-[11.5px] truncate max-w-[180px]">
                        {s.landingPage}
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)]">{s.source}</td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)]" title={s.deviceCategory}>
                        <Device size={14} />
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-[11.5px]">
                        {s.country}
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)] text-right tabular-nums">
                        {s.eventCount}
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)]">
                        {s.hadLeadAction && Lead && leadKind ?
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--theme-success-50)] text-[var(--theme-success-700)] border border-[var(--theme-success-100)] text-[11px] font-medium">
                            <Lead size={11} />
                            {LEAD_ACTION_LABELS[leadKind]}
                          </span>
                        : s.hadLeadAction ?
                          <span className="text-[var(--theme-success-700)] text-[11px]">Yes</span>
                        : <span className="text-[var(--theme-elevation-300)]">—</span>}
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)] text-[var(--theme-elevation-300)]">
                        <ArrowRight size={14} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }

          {sessions?.pagination?.hasMore && (
            <div className="px-3.5 py-3.5 flex items-center justify-between text-xs text-[var(--theme-elevation-500)]">
              <span>{formatNumber(rows.length)} rows · cursor-based pagination</span>

              <button
                type="button"
                onClick={onLoadMore}
                className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--theme-border-color)] rounded-[var(--style-radius-s)] text-xs text-[var(--theme-elevation-800)] hover:bg-[var(--theme-elevation-100)]">
                Load more
              </button>
            </div>
          )}
        </div>
      }

      {openId && (
        <SessionDrawer
          row={rows.find((r) => r.sessionId === openId) ?? ({ sessionId: openId } as SessionsRowWithLead)}
          detail={detail}
          onClose={() => {
            setOpenId(null);
            setDetail(undefined);
          }}
        />
      )}
    </div>
  );
}
