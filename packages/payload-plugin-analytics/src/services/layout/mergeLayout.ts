import type {
  AnalyticsLayoutConfig,
  BlockDefinition,
  BlockId,
  BlockPlacement,
  RowConfig,
  RowId,
  TabId,
  TabLayoutConfig,
} from "../../types/layout";

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

function mergeBlockPlacement(user: DeepPartial<BlockPlacement> | undefined, base: BlockPlacement): BlockPlacement {
  if (!user) return base;
  return {
    order: user.order ?? base.order,
    colSpan: user.colSpan ?? base.colSpan,
    ...(user.enabled !== undefined ? { enabled: user.enabled }
    : base.enabled !== undefined ? { enabled: base.enabled }
    : {}),
  };
}

function mergeRow(user: DeepPartial<RowConfig> | undefined, base: RowConfig): RowConfig {
  if (!user) return base;

  const mergedBlocks: Record<BlockId, BlockPlacement> = { ...base.blocks };
  if (user.blocks) {
    for (const [id, override] of Object.entries(user.blocks)) {
      const baseBlock = base.blocks[id];
      if (baseBlock) {
        mergedBlocks[id] = mergeBlockPlacement(override as DeepPartial<BlockPlacement>, baseBlock);
      } else if (override) {
        const o = override as DeepPartial<BlockPlacement>;
        if (o.order === undefined || o.colSpan === undefined) {
          throw new Error(
            `[payload-plugin-analytics] Block "${id}" added to row but is missing required fields { order, colSpan }`,
          );
        }
        mergedBlocks[id] = {
          order: o.order,
          colSpan: o.colSpan,
          ...(o.enabled !== undefined ? { enabled: o.enabled } : {}),
        };
      }
    }
  }

  return {
    order: user.order ?? base.order,
    columns: user.columns ?? base.columns,
    blocks: mergedBlocks,
    ...(user.enabled !== undefined ? { enabled: user.enabled }
    : base.enabled !== undefined ? { enabled: base.enabled }
    : {}),
  };
}

function mergeTab(user: DeepPartial<TabLayoutConfig> | undefined, base: TabLayoutConfig | undefined): TabLayoutConfig {
  const baseRows = base?.rows ?? {};
  const mergedRows: Record<RowId, RowConfig> = { ...baseRows };

  if (user?.rows) {
    for (const [rowId, override] of Object.entries(user.rows)) {
      const baseRow = baseRows[rowId];
      if (baseRow) {
        mergedRows[rowId] = mergeRow(override as DeepPartial<RowConfig>, baseRow);
      } else if (override) {
        const o = override as DeepPartial<RowConfig>;
        if (o.order === undefined || o.columns === undefined) {
          throw new Error(
            `[payload-plugin-analytics] Row "${rowId}" added by user but is missing required fields { order, columns }`,
          );
        }
        const blocks: Record<BlockId, BlockPlacement> = {};
        for (const [bid, b] of Object.entries(o.blocks ?? {})) {
          const bp = b as DeepPartial<BlockPlacement>;
          if (bp?.order === undefined || bp?.colSpan === undefined) {
            throw new Error(
              `[payload-plugin-analytics] Block "${bid}" in user row "${rowId}" is missing { order, colSpan }`,
            );
          }
          blocks[bid] = {
            order: bp.order,
            colSpan: bp.colSpan,
            ...(bp.enabled !== undefined ? { enabled: bp.enabled } : {}),
          };
        }
        mergedRows[rowId] = {
          order: o.order,
          columns: o.columns,
          blocks,
          ...(o.enabled !== undefined ? { enabled: o.enabled } : {}),
        };
      }
    }
  }

  return { rows: mergedRows };
}

export function mergeLayout(
  user: DeepPartial<AnalyticsLayoutConfig> | undefined,
  defaults: AnalyticsLayoutConfig,
): AnalyticsLayoutConfig {
  if (!user) return defaults;

  const mergedTabs: Partial<Record<TabId, TabLayoutConfig>> = { ...defaults.tabs };
  const allTabIds = new Set<TabId>([
    ...(Object.keys(defaults.tabs) as TabId[]),
    ...(Object.keys(user.tabs ?? {}) as TabId[]),
  ]);

  for (const tabId of allTabIds) {
    mergedTabs[tabId] = mergeTab(user.tabs?.[tabId], defaults.tabs[tabId]);
  }

  return {
    tabs: mergedTabs,
    sessionsTabComponent: user.sessionsTabComponent ?? defaults.sessionsTabComponent,
  };
}

export function mergeBlockRegistry(
  user: Record<BlockId, Partial<BlockDefinition>> | undefined,
  defaults: Record<BlockId, BlockDefinition>,
): Record<BlockId, BlockDefinition> {
  if (!user) return defaults;

  const merged: Record<BlockId, BlockDefinition> = { ...defaults };
  for (const [id, override] of Object.entries(user)) {
    const base = defaults[id];
    if (base) {
      merged[id] = {
        component: override.component ?? base.component,
        fetch: override.fetch ?? base.fetch,
      };
    } else {
      if (!override.component) {
        throw new Error(`[payload-plugin-analytics] Block "${id}" is missing required field { component }`);
      }
      merged[id] = { component: override.component, fetch: override.fetch };
    }
  }
  return merged;
}
