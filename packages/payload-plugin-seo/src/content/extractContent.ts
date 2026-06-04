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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function extractContent(data: Record<string, unknown>, fields: SeoFieldPaths): string {
  if (!fields.content) return "";

  const value = getByPath(data, fields.content);
  if (value === undefined || value === null) return "";

  return walkValue(value)
    .map((fragment) => (fragment.kind === "lexical" ? lexicalToHtml(fragment.value) : `<p>${escapeHtml(fragment.value)}</p>`))
    .filter(Boolean)
    .join("\n");
}
