"use client";

import { AlertTriangle, ExternalLink, FlaskConical } from "lucide-react";
import { useAbKpisQuery, useAbExperimentsQuery } from "../../hooks/queries/useAbQueries";
import { useAnalyticsParams } from "../../hooks/useAnalyticsParams";
import { AbKpiStrip } from "./AbKpiStrip";
import { AbExperimentsTable } from "./AbExperimentsTable";
import { AbDrawer } from "./AbDrawer";
import type { DateRange, Comparison } from "../../../../types/query";

const SETUP_GUIDE_URL =
  "https://github.com/focusreactive/payload-plugins/blob/main/packages/payload-plugin-analytics/docs/setup-ga4.md#stage-3-custom-registrations";

/**
 * A/B-specific setup gate. The shared SetupRequiredCard only knows the
 * session/lead `CustomRegistrationKey` dimensions, so the AB tab renders its
 * own card listing the missing `fr_ab_*` event-scoped custom dimensions.
 */
function AbSetupRequiredCard({ missing }: { missing: string[] }) {
  return (
    <div className="border border-dashed border-(--theme-warning-500) bg-(--theme-warning-50) rounded-(--style-radius-m) p-5">
      <div className="flex items-center gap-2 font-semibold text-(--theme-warning-700) mb-2">
        <AlertTriangle size={16} />
        <span>Setup required</span>
      </div>
      <div className="text-(--theme-warning-700) text-sm leading-relaxed">
        <p className="my-1">
          Register these event-scoped custom dimensions in GA4 Admin to enable the A/B tab:
        </p>
        <ul className="my-2 pl-5 list-disc">
          {missing.map((k) => (
            <li key={k} className="mb-1">
              <code className="font-[family-name:var(--font-mono)] bg-(--theme-warning-100) px-1.5 rounded text-[11px]">
                {k}
              </code>
            </li>
          ))}
        </ul>
        <a
          href={SETUP_GUIDE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-(--theme-warning-700) mt-2"
        >
          Setup guide <ExternalLink size={12} />
        </a>
        <p className="mt-2 text-[12.5px] text-(--theme-warning-700)/80">
          After registering, GA4 takes up to 24 hours to backfill data.
        </p>
      </div>
    </div>
  );
}

export interface AbTabProps {
  dateRange: DateRange;
  comparison: Comparison;
}

export function AbTab({ dateRange, comparison }: AbTabProps) {
  const { selectedExperiment, setSelectedExperiment } = useAnalyticsParams();
  const query = { dateRange, comparison };
  const kpis = useAbKpisQuery(query);
  const experiments = useAbExperimentsQuery(query);

  const missing = experiments.data?.missing ?? kpis.data?.missing;
  if (missing?.length) {
    return <AbSetupRequiredCard missing={missing} />;
  }

  const rows = experiments.data?.rows ?? [];

  return (
    <div className="flex flex-col gap-4">
      <AbKpiStrip data={kpis.data} />

      <div className="mt-1 flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-(--theme-elevation-1000)">
          <FlaskConical size={14} />

          <span>Experiments</span>
        </div>

        <span className="text-xs text-(--theme-elevation-500)">
          {experiments.isLoading
            ? "Loading…"
            : `Click a row to open the deep dive · ${rows.length} experiments`}
        </span>
      </div>

      {rows.length === 0 && !experiments.isLoading ? (
        <div className="rounded-(--style-radius-m) border border-(--theme-border-color) bg-(--theme-elevation-0) p-6 text-center text-(--theme-elevation-500)">
          Publish a variant on any A/B-enabled document to start tracking experiments here.
        </div>
      ) : (
        <AbExperimentsTable rows={rows} onOpen={setSelectedExperiment} />
      )}

      {selectedExperiment && (
        <AbDrawer
          manifestKey={selectedExperiment}
          query={query}
          onClose={() => setSelectedExperiment(null)}
        />
      )}
    </div>
  );
}
