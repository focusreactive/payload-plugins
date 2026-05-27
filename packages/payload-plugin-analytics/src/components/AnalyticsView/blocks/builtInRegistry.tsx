import type { ComponentType } from "react";
import type { BlockComponentProps, BlockId } from "../../../types/layout";

import { SessionsKpiBlock } from "./SessionsKpiBlock";
import { UsersKpiBlock } from "./UsersKpiBlock";
import { PageviewsKpiBlock } from "./PageviewsKpiBlock";
import { BounceRateKpiBlock } from "./BounceRateKpiBlock";
import { AvgDurationKpiBlock } from "./AvgDurationKpiBlock";
import { TrendChartBlock } from "./TrendChartBlock";
import { TopPagesBlock } from "./TopPagesBlock";
import { TopSourcesBlock } from "./TopSourcesBlock";
import { TopEventsBlock } from "./TopEventsBlock";
import { DevicesDonutBlock } from "./DevicesDonutBlock";
import { TopCountriesBlock } from "./TopCountriesBlock";
import { TotalLeadsKpiBlock } from "./TotalLeadsKpiBlock";
import { ConversionRateKpiBlock } from "./ConversionRateKpiBlock";
import { AvgTimeKpiBlock } from "./AvgTimeKpiBlock";
import { LeadActionsByTypeBlock } from "./LeadActionsByTypeBlock";
import { PerPageBreakdownBlock } from "./PerPageBreakdownBlock";
import { DiscoveryPathsBlock } from "./DiscoveryPathsBlock";

export const BUILTIN_BLOCK_COMPONENTS: Record<BlockId, ComponentType<BlockComponentProps>> = {
  "sessions-kpi": SessionsKpiBlock,
  "users-kpi": UsersKpiBlock,
  "pageviews-kpi": PageviewsKpiBlock,
  "bounce-rate-kpi": BounceRateKpiBlock,
  "avg-duration-kpi": AvgDurationKpiBlock,
  "trend-chart": TrendChartBlock,
  "top-pages": TopPagesBlock,
  "top-sources": TopSourcesBlock,
  "top-events": TopEventsBlock,
  "devices-donut": DevicesDonutBlock,
  "top-countries": TopCountriesBlock,
  "total-leads-kpi": TotalLeadsKpiBlock,
  "conversion-rate-kpi": ConversionRateKpiBlock,
  "avg-time-kpi": AvgTimeKpiBlock,
  "lead-actions-by-type": LeadActionsByTypeBlock,
  "per-page-breakdown": PerPageBreakdownBlock,
  "discovery-paths": DiscoveryPathsBlock,
};
