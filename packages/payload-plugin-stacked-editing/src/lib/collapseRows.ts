import type { FormState } from "payload";

type Row = { id?: string; collapsed?: boolean; [key: string]: unknown };

export type CollapseAction = { path: string; updatedRows: Row[] };

export type CollapseMemory = {
  readonly rowsExpandedByEditor: Set<string>;
  readonly fieldsJustToggledByEditor: Set<string>;
};

const rowsOfField = (field: unknown): Row[] | undefined => {
  const { rows } = field as { rows?: unknown };
  return Array.isArray(rows) ? (rows as Row[]) : undefined;
};

const rememberEditorChoice = (rows: Row[], memory: CollapseMemory) => {
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
};

const shouldCollapse = (row: Row, memory: CollapseMemory): boolean =>
  !row.collapsed && !(row.id && memory.rowsExpandedByEditor.has(row.id));

export const rowsToCollapse = (fields: FormState, memory: CollapseMemory): CollapseAction[] => {
  const actions: CollapseAction[] = [];
  for (const [path, field] of Object.entries(fields)) {
    const rows = rowsOfField(field);
    if (!rows) {
      continue;
    }
    if (memory.fieldsJustToggledByEditor.delete(path)) {
      rememberEditorChoice(rows, memory);
      continue;
    }
    if (rows.some((row) => shouldCollapse(row, memory))) {
      const updatedRows = rows.map((row) =>
        shouldCollapse(row, memory) ? { ...row, collapsed: true } : row
      );
      actions.push({ path, updatedRows });
    }
  }
  return actions;
};

export const rowsSignature = (fields: FormState): string => {
  const parts: string[] = [];
  for (const [path, field] of Object.entries(fields)) {
    const rows = rowsOfField(field);
    if (rows) {
      parts.push(`${path}:${rows.map((row) => `${row.id}${row.collapsed ? "-" : "+"}`).join(",")}`);
    }
  }
  return parts.join("|");
};
