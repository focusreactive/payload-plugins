export type ContentFragment = { kind: "text"; value: string } | { kind: "lexical"; value: { root?: unknown } };

const SKIP_KEYS = new Set(["id", "blockType", "blockName", "_template", "order"]);

function isLexical(v: unknown): v is { root?: unknown } {
  return typeof v === "object" && v !== null && "root" in (v as Record<string, unknown>);
}

export function walkValue(value: unknown): ContentFragment[] {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed ? [{ kind: "text", value }] : [];
  }
  if (isLexical(value)) return [{ kind: "lexical", value }];
  if (Array.isArray(value)) return value.flatMap(walkValue);
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SKIP_KEYS.has(key))
      .flatMap(([, v]) => walkValue(v));
  }

  return [];
}
