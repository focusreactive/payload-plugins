import type { FormState } from "payload";

type Row = { id?: string; collapsed?: boolean; [key: string]: unknown };

export type CollapseAction = { path: string; updatedRows: Row[] };

export type CollapseMemory = {
  readonly rowsExpandedByEditor: Set<string>;
  readonly fieldsJustToggledByEditor: Set<string>;
};

export const rowsToCollapse = (fields: FormState, memory: CollapseMemory): CollapseAction[] => {
  const actions: CollapseAction[] = [];
  for (const [path, field] of Object.entries(fields)) {
    const rows = (field as { rows?: Row[] }).rows;
    if (!Array.isArray(rows)) {
      continue;
    }
    if (memory.fieldsJustToggledByEditor.delete(path)) {
      for (const row of rows) {
        if (!row.id) {
          continue;
        }
        if (row.collapsed) {
          memory.rowsExpandedByEditor.delete(row.id);
        } else {
          memory.rowsExpandedByEditor.add(row.id);
        }
      }
      continue;
    }
    let changed = false;
    const updatedRows = rows.map((row) => {
      if (row.collapsed || (row.id && memory.rowsExpandedByEditor.has(row.id))) {
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
