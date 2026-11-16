import type { FormState } from "payload";

type Row = { id?: string; collapsed?: boolean; [key: string]: unknown };

export type CollapseAction = { path: string; updatedRows: Row[] };

export type CollapseMemory = {
  /** Rows the editor expanded inline themselves (chevron, "Show All"); they stay expanded. */
  readonly userExpanded: Set<string>;
  /**
   * Array/blocks fields whose rows the editor just toggled. Their rows' current state is taken as
   * the editor's choice instead of being collapsed again; each path is consumed once.
   */
  readonly pendingFields: Set<string>;
};

/**
 * `SET_ROW_COLLAPSED` actions that make every array/blocks row a collapsed card unless the editor
 * expanded it inline. Run whenever rows change, so it also covers rows that are added later and
 * form state that Payload replaces (initial load, save), which brings rows back expanded.
 */
export const rowsToCollapse = (fields: FormState, memory: CollapseMemory): CollapseAction[] => {
  const actions: CollapseAction[] = [];
  for (const [path, field] of Object.entries(fields)) {
    const rows = (field as { rows?: Row[] }).rows;
    if (!Array.isArray(rows)) {
      continue;
    }
    if (memory.pendingFields.delete(path)) {
      for (const row of rows) {
        if (!row.id) {
          continue;
        }
        if (row.collapsed) {
          memory.userExpanded.delete(row.id);
        } else {
          memory.userExpanded.add(row.id);
        }
      }
      continue;
    }
    let changed = false;
    const updatedRows = rows.map((row) => {
      if (row.collapsed || (row.id && memory.userExpanded.has(row.id))) {
        return row;
      }
      changed = true;
      return { ...row, collapsed: true };
    });
    if (changed) {
      actions.push({ path, updatedRows });
    }
  }
  return actions;
};

/** Changes whenever any row is added, removed or collapsed/expanded — not on keystrokes. */
export const rowsSignature = (fields: FormState): string => {
  const parts: string[] = [];
  for (const [path, field] of Object.entries(fields)) {
    const rows = (field as { rows?: Row[] }).rows;
    if (Array.isArray(rows)) {
      parts.push(`${path}:${rows.map((row) => `${row.id}${row.collapsed ? "-" : "+"}`).join(",")}`);
    }
  }
  return parts.join("|");
};
