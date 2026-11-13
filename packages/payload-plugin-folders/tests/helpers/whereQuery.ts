import type { Where } from "payload";

const appendWhere = (parts: string[], prefix: string, value: unknown): void => {
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      appendWhere(parts, `${prefix}[${key}]`, child);
    }

    return;
  }
  parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
};

/** A `where` object as the query string a REST client sends: `where[or][0][pathSegment][equals]=x`. */
export const toWhereQueryString = (where: Where, extra: Record<string, string> = {}): string => {
  const parts: string[] = [];
  appendWhere(parts, "where", where);
  for (const [key, value] of Object.entries(extra)) {
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }

  return parts.join("&");
};
