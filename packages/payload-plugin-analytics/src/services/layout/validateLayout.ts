import { PLUGIN_NAME } from "../../constants";
import type { AnalyticsLayoutConfig, BlockDefinition, BlockId } from "../../types/layout";

function err(message: string): never {
  throw new Error(`[${PLUGIN_NAME}] ${message}`);
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}

export function validateResolvedLayout(
  layout: AnalyticsLayoutConfig,
  registry: Record<BlockId, BlockDefinition>,
): void {
  for (const [tabId, tab] of Object.entries(layout.tabs)) {
    if (!tab) continue;

    const rows = Object.entries(tab.rows).filter(([, r]) => r.enabled !== false);

    const rowOrders = new Map<number, string>();
    for (const [rowId, row] of rows) {
      if (!isPositiveInt(row.columns)) {
        err(`Tab "${tabId}" row "${rowId}": columns must be a positive integer, got ${row.columns}`);
      }

      if (rowOrders.has(row.order)) {
        err(`Tab "${tabId}": duplicate row order ${row.order} between "${rowOrders.get(row.order)}" and "${rowId}"`);
      }
      rowOrders.set(row.order, rowId);
    }

    const blockToRow = new Map<BlockId, string>();
    for (const [rowId, row] of rows) {
      const blockOrders = new Map<number, string>();
      const enabledBlocks = Object.entries(row.blocks).filter(([, b]) => b.enabled !== false);

      for (const [blockId, block] of enabledBlocks) {
        if (!registry[blockId]) {
          err(`Tab "${tabId}" row "${rowId}": unknown block id "${blockId}" (not in registry)`);
        }

        if (!isPositiveInt(block.colSpan)) {
          if (typeof block.colSpan !== "number" || !Number.isFinite(block.colSpan)) {
            err(`Tab "${tabId}" row "${rowId}" block "${blockId}": colSpan must be a positive integer`);
          }
          if (block.colSpan <= 0) {
            err(`Tab "${tabId}" row "${rowId}" block "${blockId}": colSpan must be positive, got ${block.colSpan}`);
          }
          if (!Number.isInteger(block.colSpan)) {
            err(`Tab "${tabId}" row "${rowId}" block "${blockId}": colSpan must be an integer, got ${block.colSpan}`);
          }
        }

        if (blockOrders.has(block.order)) {
          err(
            `Tab "${tabId}" row "${rowId}": duplicate block order ${block.order} between "${blockOrders.get(block.order)}" and "${blockId}"`,
          );
        }
        blockOrders.set(block.order, blockId);

        const previousRow = blockToRow.get(blockId);
        if (previousRow) {
          err(`Tab "${tabId}": block "${blockId}" appears in multiple rows ("${previousRow}", "${rowId}")`);
        }
        blockToRow.set(blockId, rowId);
      }
    }
  }
}
