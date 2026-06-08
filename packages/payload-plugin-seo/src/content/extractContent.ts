import type { SeoFieldPaths } from "../types/config";
import { lexicalToHtml } from "./lexicalToHtml";
import { walkValue } from "./walkValue";

function getByPath(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }

    return undefined;
  }, data);
}

function escapeHtml(s: string): string {
  return s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

export function extractContent(data: Record<string, unknown>, fields: SeoFieldPaths): string {
  if (!fields.content) return "";

  const value = getByPath(data, fields.content);
  if (value === undefined || value === null) return "";

  return walkValue(value)
    .map((fragment) => {
      if (fragment.kind === "lexical") return lexicalToHtml(fragment.value);
      if (fragment.kind === "html") return fragment.value;

      return `<p>${escapeHtml(fragment.value)}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
