"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { DateRange, Comparison, DeviceCategory, DateRangePreset } from "../../../types/query";

export type AnalyticsTab = "overview" | "lead-actions" | "sessions" | "ab";

export interface SessionsFilters {
  hadLeadAction?: boolean;
  source?: string;
  device?: DeviceCategory;
  country?: string;
}

export interface UseAnalyticsParamsResult {
  tab: AnalyticsTab;
  dateRange: DateRange;
  comparison: Comparison;
  sessions: SessionsFilters;
  selectedExperiment: string | null;
  setTab: (tab: AnalyticsTab) => void;
  setDateRange: (range: DateRange) => void;
  setComparison: (cmp: Comparison) => void;
  setSessions: (filters: Partial<SessionsFilters>) => void;
  setSelectedExperiment: (manifestKey: string | null) => void;
}

const VALID_TABS = new Set<AnalyticsTab>(["overview", "lead-actions", "sessions", "ab"]);
const VALID_DEVICES = new Set<DeviceCategory>(["desktop", "mobile", "tablet", "other"]);
const VALID_PRESETS = new Set([
  "today",
  "yesterday",
  "last-7d",
  "last-14d",
  "last-30d",
  "last-90d",
]);

export function useAnalyticsParams(): UseAnalyticsParamsResult {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = useMemo<AnalyticsTab>(() => {
    const raw = searchParams.get("tab") as AnalyticsTab;

    return VALID_TABS.has(raw) ? raw : "overview";
  }, [searchParams]);

  const dateRange = useMemo<DateRange>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from && to) {
      return {
        from,
        to,
      };
    }

    const rawPreset = searchParams.get("range") as DateRangePreset;
    const preset = VALID_PRESETS.has(rawPreset) ? rawPreset : "last-14d";

    return { preset };
  }, [searchParams]);

  const comparison = useMemo<Comparison>(() => {
    const raw = searchParams.get("compare") as Comparison["kind"];

    return { kind: raw || "none" };
  }, [searchParams]);

  const selectedExperiment = useMemo<string | null>(() => {
    return tab === "ab" ? searchParams.get("experiment") : null;
  }, [searchParams, tab]);

  const sessions: SessionsFilters = useMemo(() => {
    if (tab !== "sessions") return {};

    const filters: SessionsFilters = {};

    const hadLead = searchParams.get("hadLead");
    if (hadLead === "true") filters.hadLeadAction = true;

    const source = searchParams.get("src");
    if (source) filters.source = source;

    const device = searchParams.get("dev") as DeviceCategory | null;
    if (device && VALID_DEVICES.has(device)) filters.device = device;

    const country = searchParams.get("cnt");
    if (country) filters.country = country;

    return filters;
  }, [searchParams, tab]);

  const writeParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(window.location.search);

      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }

      const qs = next.toString();
      window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}`);
    },
    [pathname]
  );

  const setTab = useCallback(
    (nextTab: AnalyticsTab) => {
      writeParams({ tab: nextTab });
    },
    [writeParams]
  );

  const setDateRange = useCallback(
    (range: DateRange) => {
      if ("preset" in range) {
        writeParams({
          range: range.preset,
          from: null,
          to: null,
        });
      } else {
        writeParams({
          range: null,
          from: range.from,
          to: range.to,
        });
      }
    },
    [writeParams]
  );

  const setComparison = useCallback(
    (cmp: Comparison) => {
      writeParams({ compare: cmp.kind || null });
    },
    [writeParams]
  );

  const setSelectedExperiment = useCallback(
    (manifestKey: string | null) => {
      writeParams({ experiment: manifestKey ?? null });
    },
    [writeParams]
  );

  const setSessions = useCallback(
    (filters: Partial<SessionsFilters>) => {
      writeParams({
        hadLead: filters.hadLeadAction
          ? "true"
          : filters.hadLeadAction === false
            ? null
            : undefined,
        src: filters.source ?? undefined,
        dev: filters.device ?? undefined,
        cnt: filters.country ?? undefined,
      });
    },
    [writeParams]
  );

  return {
    tab,
    dateRange,
    comparison,
    sessions,
    selectedExperiment,
    setTab,
    setDateRange,
    setComparison,
    setSessions,
    setSelectedExperiment,
  };
}
