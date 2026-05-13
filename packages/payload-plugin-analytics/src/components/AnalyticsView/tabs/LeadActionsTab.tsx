"use client";

import { useMemo } from "react";
import { LeadActionsTabView } from "./LeadActionsTabView";
import { useKpisQuery } from "../hooks/queries/useKpisQuery";
import { useLeadActionsQuery } from "../hooks/queries/useLeadActionsQuery";
import { useJourneysQuery } from "../hooks/queries/useJourneysQuery";
import type { Comparison, DateRange } from "../../../types/query";

const JOURNEYS_LIMIT = 20;
const JOURNEYS_MAX_STEPS = 8;

export interface LeadActionsTabProps {
  dateRange: DateRange;
  comparison: Comparison;
}

export function LeadActionsTab({ dateRange, comparison }: LeadActionsTabProps) {
  const base = useMemo(() => ({ dateRange, comparison }), [dateRange, comparison]);
  const journeysQuery = useMemo(() => ({ ...base, limit: JOURNEYS_LIMIT, maxSteps: JOURNEYS_MAX_STEPS }), [base]);

  const kpis = useKpisQuery(base);
  const leadActions = useLeadActionsQuery(base);
  const journeys = useJourneysQuery(journeysQuery);

  return (
    <LeadActionsTabView
      comparison={comparison}
      leadActions={leadActions.data}
      journeys={journeys.data}
      totalSessions={kpis.data?.current.sessions ?? 0}
      loading={{
        kpis: kpis.isLoading,
        leadActions: leadActions.isLoading,
        journeys: journeys.isLoading,
      }}
      errors={{
        leadActions: leadActions.error ?? undefined,
        journeys: journeys.error ?? undefined,
      }}
    />
  );
}
