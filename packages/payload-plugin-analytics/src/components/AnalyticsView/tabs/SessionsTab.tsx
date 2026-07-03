"use client";

import { useMemo, useState } from "react";
import { SessionsTabView } from "./SessionsTabView";
import { useSessionsQuery } from "../hooks/queries/useSessionsQuery";
import { useSessionsOptionsQuery } from "../hooks/queries/useSessionsOptionsQuery";
import { useSessionDetailQuery } from "../hooks/queries/useSessionDetailQuery";
import type { DateRange } from "../../../types/query";
import type { SessionsFilters } from "../hooks/useAnalyticsParams";

const SESSIONS_PAGE_SIZE = 50;

export interface SessionsTabProps {
  dateRange: DateRange;
  filters: SessionsFilters;
  onFiltersChange: (patch: Partial<SessionsFilters>) => void;
}

export function SessionsTab({ dateRange, filters, onFiltersChange }: SessionsTabProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const listQuery = useMemo(
    () => ({
      dateRange,
      comparison: { kind: "none" as const },
      hadLeadAction: filters.hadLeadAction,
      source: filters.source,
      device: filters.device,
      country: filters.country,
      limit: SESSIONS_PAGE_SIZE,
    }),
    [dateRange, filters]
  );

  const sessions = useSessionsQuery(listQuery);
  const options = useSessionsOptionsQuery(dateRange);
  const detail = useSessionDetailQuery(openId, dateRange);

  const rows = sessions.data?.pages.flatMap((p) => p.rows) ?? [];
  const firstPage = sessions.data?.pages[0];

  return (
    <SessionsTabView
      filters={filters}
      onFiltersChange={onFiltersChange}
      rows={rows}
      sourceOptions={options.data?.sources ?? []}
      countryOptions={options.data?.countries ?? []}
      setupRequired={firstPage?.setupRequired}
      missing={firstPage?.missing}
      hasNextPage={sessions.hasNextPage ?? false}
      isFetchingNextPage={sessions.isFetchingNextPage}
      onLoadMore={() => void sessions.fetchNextPage()}
      loading={sessions.isLoading}
      refreshing={sessions.isPlaceholderData}
      error={sessions.error ?? undefined}
      openId={openId}
      onOpenRow={setOpenId}
      onCloseDrawer={() => setOpenId(null)}
      detail={detail.data}
      detailLoading={detail.isLoading}
      detailError={detail.error ?? undefined}
    />
  );
}
