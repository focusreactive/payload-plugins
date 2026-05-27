import type { PayloadRequest } from "payload";
import type { Comparison, DateRange } from "./query";

export type TabId = "overview" | "lead-actions" | "sessions";

export type BlockId = string;
export type RowId = string;

export interface ScopedGa4Client {
  runReport: (request: object) => Promise<unknown>;
  batchRunReports: (request: object) => Promise<unknown>;
}

export interface BlockFetchArgs {
  dateRange: DateRange;
  comparison: Comparison;
  ga4: ScopedGa4Client;
  req: PayloadRequest;
}

export interface BlockDefinition<TData = unknown> {
  component: string;
  fetch?: (args: BlockFetchArgs) => Promise<TData>;
}

export interface BlockPlacement {
  order: number;
  colSpan: number;
  enabled?: boolean;
}

export interface RowConfig {
  order: number;
  columns: number;
  blocks: Record<BlockId, BlockPlacement>;
  enabled?: boolean;
}

export interface TabLayoutConfig {
  rows: Record<RowId, RowConfig>;
}

export interface AnalyticsLayoutConfig {
  tabs: Partial<Record<TabId, TabLayoutConfig>>;
  sessionsTabComponent?: string;
}

export interface BlockComponentProps<TData = unknown> {
  data?: TData;
  loading?: boolean;
  error?: Error;
  dateRange: DateRange;
  comparison: Comparison;
  colSpan: number;
  t: (key: string) => string;
}

export interface ResolvedRow extends RowConfig {
  id: RowId;
}

export interface ResolvedBlock extends BlockPlacement {
  id: BlockId;
}

export interface ResolvedTab {
  id: TabId;
  rows: ResolvedRow[];
}

export interface ResolvedLayout {
  tabs: ResolvedTab[];
  sessionsTabComponent: string | null;
}
