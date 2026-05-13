"use client";

import { RotateCcw } from "lucide-react";
import { useAnalyticsRefresh } from "./hooks/queries/useAnalyticsRefresh";
import { cn } from "../../utils/style";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function formatRelativeTime(timestamp: number, now = Date.now()) {
  const delta = Math.max(0, now - timestamp);

  if (delta < MINUTE_MS) return "just now";
  if (delta < HOUR_MS) {
    const m = Math.floor(delta / MINUTE_MS);

    return `${m} min ago`;
  }
  if (delta < DAY_MS) {
    const h = Math.floor(delta / HOUR_MS);

    return `${h} h ago`;
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

export function RefreshButton() {
  const { refresh, lastUpdatedAt, isFetching } = useAnalyticsRefresh();
  const label = lastUpdatedAt ? `Updated ${formatRelativeTime(lastUpdatedAt)}` : "Refresh";

  return (
    <button
      type="button"
      onClick={() => refresh()}
      disabled={isFetching}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] text-[var(--theme-elevation-700)] hover:text-[var(--theme-elevation-1000)] disabled:opacity-60 disabled:cursor-default">
      <RotateCcw size={13} className={cn(isFetching && "animate-spin")} />

      <span>{isFetching ? "Refreshing…" : label}</span>
    </button>
  );
}
