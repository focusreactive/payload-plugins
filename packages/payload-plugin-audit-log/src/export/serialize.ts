import { getNestedValue } from "../utils/getNestedValue";

export const CSV_COLUMNS = [
  "id",
  "occurredAt",
  "action",
  "status",
  "actor.type",
  "actor.docId",
  "actor.collection",
  "actor.label",
  "actor.source",
  "onBehalfOf.label",
  "agent.keyId",
  "agent.name",
  "agent.model",
  "agent.tool",
  "via",
  "target.kind",
  "target.slug",
  "target.docId",
  "target.label",
  "target.locale",
  "changes",
  "overrideAccess",
  "requestId",
] as const;

const SPREADSHEET_FORMULA_PREFIX = /^[=+\-@\t\r]/u;
const CSV_SPECIAL_CHARACTERS = /[",\r\n]/u;

function csvCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  let cell = Array.isArray(value) ? value.join(";") : String(value);
  if (SPREADSHEET_FORMULA_PREFIX.test(cell)) cell = `'${cell}`;
  return CSV_SPECIAL_CHARACTERS.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

export const csvHeader = (): string => `${CSV_COLUMNS.join(",")}\n`;

export const csvRows = (rows: unknown[]): string =>
  rows
    .map(
      (row) => `${CSV_COLUMNS.map((column) => csvCell(getNestedValue(row, column))).join(",")}\n`
    )
    .join("");

export const ndjsonRows = (rows: unknown[]): string =>
  rows.map((row) => `${JSON.stringify(row)}\n`).join("");
