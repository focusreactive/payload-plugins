"use client";

import { ArrowRight } from "lucide-react";
import { SetupRequiredCard } from "../ui/SetupRequiredCard";
import { SkeletonBlock } from "../ui/SkeletonBlock";
import { ErrorTile } from "../ui/ErrorTile";
import { EmptyTile } from "../ui/EmptyTile";
import { SessionsFilters } from "./SessionsFilters";
import { SessionDrawer } from "./SessionDrawer";
import { getDeviceIcon } from "../icons";
import { cn } from "../../../utils/style";
import { formatNumber } from "../numberFormatters";
import type {
  CustomRegistrationKey,
  DeviceCategory,
  SessionDetailResponse,
  SessionsRow,
} from "../../../types/query";
import type { SessionsFilters as Filters } from "../hooks/useAnalyticsParams";

export interface SessionsTabViewProps {
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
  rows: SessionsRow[];
  sourceOptions: string[];
  countryOptions: string[];
  setupRequired?: true;
  missing?: CustomRegistrationKey[];
  hasNextPage: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  loading?: boolean;
  error?: Error;
  openId: string | null;
  onOpenRow: (sessionId: string) => void;
  onCloseDrawer: () => void;
  detail?: SessionDetailResponse;
  detailLoading?: boolean;
  detailError?: Error;
}

type SessionsRowWithLead = SessionsRow;

export function SessionsTabView({
  filters,
  onFiltersChange,
  rows,
  sourceOptions,
  countryOptions,
  setupRequired,
  missing,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  loading,
  error,
  openId,
  onOpenRow,
  onCloseDrawer,
  detail,
}: SessionsTabViewProps) {
  const typedRows = rows as SessionsRowWithLead[];

  return (
    <div>
      <SessionsFilters
        filters={filters}
        onChange={onFiltersChange}
        sourceOptions={sourceOptions}
        countryOptions={countryOptions}
      />

      {setupRequired ? (
        <SetupRequiredCard missingKeys={missing ?? ["fr_session_id"]} />
      ) : (
        <div className="bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] overflow-hidden">
          {loading ? (
            <div className="p-4">
              <SkeletonBlock shape="table" rows={6} />
            </div>
          ) : error ? (
            <ErrorTile error={error} />
          ) : typedRows.length === 0 ? (
            <EmptyTile message="No sessions matched these filters." />
          ) : (
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Started
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Landing page
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Source
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Device
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Country
                  </th>

                  <th className="text-right text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Events
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]">
                    Lead
                  </th>

                  <th className="text-left text-[10px] uppercase tracking-widest text-[var(--theme-elevation-500)] font-semibold p-3 bg-[var(--theme-elevation-50)] border-b border-[var(--theme-border-color)]" />
                </tr>
              </thead>

              <tbody>
                {typedRows.map((s) => {
                  const devices =
                    s.deviceCategory.length > 0
                      ? Array.from(new Set(s.deviceCategory))
                      : ["other" as const];
                  const isSelected = openId === s.sessionId;

                  return (
                    <tr
                      key={s.sessionId}
                      onClick={() => onOpenRow(s.sessionId)}
                      className={cn(
                        "cursor-pointer hover:bg-[var(--theme-elevation-50)] text-[12.5px]",
                        isSelected && "bg-[var(--theme-elevation-100)]"
                      )}
                    >
                      <td className="max-w-[80px] p-3 border-b border-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-[11.5px]">
                        {s.startedAt.length > 5 ? s.startedAt.slice(11, 16) : s.startedAt}
                      </td>

                      <td className="w-full max-w-[200px] p-3 border-b border-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-[11.5px] truncate">
                        {s.landingPage}
                      </td>

                      <td className="max-w-[100px] p-3 border-b border-[var(--theme-elevation-100)]">
                        {s.source}
                      </td>

                      <td
                        className="max-w-[100px] p-3 border-b border-[var(--theme-elevation-100)]"
                        title={s.deviceCategory.join(", ")}
                      >
                        <span className="inline-flex items-center gap-1">
                          {devices.map((d) => {
                            const Device = getDeviceIcon(d);
                            return <Device key={d} size={14} />;
                          })}
                        </span>
                      </td>

                      <td className="max-w-[200px] p-3 border-b border-[var(--theme-elevation-100)] font-[family-name:var(--font-mono)] text-[11.5px] truncate">
                        {s.country.join(", ")}
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)] text-right tabular-nums">
                        {s.eventCount}
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)]">
                        {s.hadLeadAction ? (
                          <span className="text-[var(--theme-success-700)] text-[11px]">Yes</span>
                        ) : (
                          <span className="text-[var(--theme-elevation-300)]">—</span>
                        )}
                      </td>

                      <td className="p-3 border-b border-[var(--theme-elevation-100)] text-[var(--theme-elevation-300)]">
                        <ArrowRight size={14} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {hasNextPage && (
            <div className="px-3.5 py-3.5 flex items-center justify-between text-xs text-[var(--theme-elevation-500)]">
              <span>{formatNumber(typedRows.length)} rows · cursor-based pagination</span>

              <button
                type="button"
                onClick={onLoadMore}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--theme-border-color)] rounded-[var(--style-radius-s)] text-xs text-[var(--theme-elevation-800)] hover:bg-[var(--theme-elevation-100)] disabled:opacity-60"
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {openId && (
        <SessionDrawer
          row={
            typedRows.find((r) => r.sessionId === openId) ?? {
              sessionId: openId,
              landingPage: "",
              source: "",
              deviceCategory: [] as DeviceCategory[],
              country: [],
              startedAt: "",
              eventCount: 0,
              hadLeadAction: false,
            }
          }
          detail={detail}
          onClose={onCloseDrawer}
        />
      )}
    </div>
  );
}
