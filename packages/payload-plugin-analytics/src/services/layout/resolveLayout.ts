import type { AnalyticsPluginConfig } from "../../types/config";
import type {
  AnalyticsLayoutConfig,
  BlockDefinition,
  BlockId,
  ResolvedBlock,
  ResolvedLayout,
  ResolvedRow,
  ResolvedTab,
  TabId,
} from "../../types/layout";
import { getDefaultBlockRegistry, getDefaultLayout } from "./defaults";
import { mergeBlockRegistry, mergeLayout } from "./mergeLayout";
import { validateResolvedLayout } from "./validateLayout";

export interface ResolveLayoutResult {
  layout: AnalyticsLayoutConfig;
  registry: Record<BlockId, BlockDefinition>;
  resolved: ResolvedLayout;
}

function compileResolved(layout: AnalyticsLayoutConfig): ResolvedLayout {
  const tabs: ResolvedTab[] = [];

  for (const [tabIdRaw, tab] of Object.entries(layout.tabs)) {
    if (!tab) continue;
    const tabId = tabIdRaw as TabId;

    const rows: ResolvedRow[] = Object.entries(tab.rows)
      .filter(([, row]) => row.enabled !== false)
      .map(([id, row]) => ({
        id,
        order: row.order,
        columns: row.columns,
        blocks: row.blocks,
        ...(row.enabled !== undefined ? { enabled: row.enabled } : {}),
      }))
      .sort((a, b) => a.order - b.order);

    const compiledRows = rows.map((row) => {
      const blocks: ResolvedBlock[] = Object.entries(row.blocks)
        .filter(([, b]) => b.enabled !== false)
        .map(([id, b]) => ({
          id,
          order: b.order,
          colSpan: b.colSpan,
          ...(b.enabled !== undefined ? { enabled: b.enabled } : {}),
        }))
        .sort((a, b) => a.order - b.order);
      return { ...row, blocks: blocks as unknown as ResolvedRow["blocks"] };
    });

    tabs.push({ id: tabId, rows: compiledRows as unknown as ResolvedRow[] });
  }

  tabs.sort((a, b) => {
    const order = ["overview", "lead-actions", "sessions"] as const;
    return order.indexOf(a.id) - order.indexOf(b.id);
  });

  return { tabs, sessionsTabComponent: layout.sessionsTabComponent ?? null };
}

export function resolveLayout(config: AnalyticsPluginConfig): ResolveLayoutResult {
  const layout = mergeLayout(config.layout, getDefaultLayout());
  const registry = mergeBlockRegistry(config.blocks, getDefaultBlockRegistry());
  validateResolvedLayout(layout, registry);
  const resolved = compileResolved(layout);
  return { layout, registry, resolved };
}
