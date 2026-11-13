import type { PlainObject } from "./plainObject.js";

import { isPlainObject } from "./plainObject.js";

export const rowWithId = (rows: unknown, rowId: string): PlainObject | undefined => {
  if (!Array.isArray(rows)) return undefined;
  return rows.find((row): row is PlainObject => isPlainObject(row) && String(row.id) === rowId);
};
