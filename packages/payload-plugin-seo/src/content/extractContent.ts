import type { ContentNode } from "./schema/nodes";
import type { ContentSelection, SeoFieldPaths } from "../types/config";
import { walkValue } from "./walk/walkValue";

function getByPath(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

function normalizeSelection(content: SeoFieldPaths["content"]): ContentSelection | null {
  if (content == null) return null;
  if (typeof content === "string") return { include: [content], exclude: [] };
  return { include: content.include ?? [], exclude: content.exclude ?? [] };
}

function metadataPaths(fields: SeoFieldPaths): string[] {
  return [fields.seoTitle, fields.metaDescription, fields.slug ?? "slug"].filter((p): p is string => p !== undefined);
}

export function extractContent(data: Record<string, unknown>, fields: SeoFieldPaths): ContentNode[] {
  const sel = normalizeSelection(fields.content);
  if (sel === null) return [];

  const excluded = new Set<string>([...metadataPaths(fields), ...(sel.exclude ?? [])]);
  const roots = sel.include && sel.include.length > 0 ? sel.include.map((p) => ({ value: getByPath(data, p), path: p })) : [{ value: data as unknown, path: "" }];

  return roots.flatMap((r) => (r.value == null ? [] : walkValue(r.value, { excluded, path: r.path })));
}
