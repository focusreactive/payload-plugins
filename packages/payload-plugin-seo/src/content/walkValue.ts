export type ContentFragment = { kind: "text"; value: string } | { kind: "lexical"; value: { root?: unknown } } | { kind: "html"; value: string };

const SKIP_KEYS = new Set(["id", "blockType", "blockName", "_template", "order"]);

function isLexical(v: unknown): v is { root?: unknown } {
  return typeof v === "object" && v !== null && "root" in (v as Record<string, unknown>);
}

function nonEmptyString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function escapeAttr(s: string): string {
  return s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}

function escapeText(s: string): string {
  return s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

function asImage(o: Record<string, unknown>): { url: string; alt: string } | undefined {
  const url = nonEmptyString(o.url);
  const mime = nonEmptyString(o.mimeType);
  if (url && mime?.startsWith("image/")) return { url, alt: nonEmptyString(o.alt) ?? "" };

  return undefined;
}

function asLink(o: Record<string, unknown>): { url: string; label: string } | undefined {
  const url = nonEmptyString(o.url);
  if (!url) return undefined;
  const label = nonEmptyString(o.label) ?? nonEmptyString(o.text) ?? nonEmptyString(o.title);

  return label ? { url, label } : undefined;
}

export function walkValue(value: unknown): ContentFragment[] {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed ? [{ kind: "text", value }] : [];
  }
  if (isLexical(value)) return [{ kind: "lexical", value }];
  if (Array.isArray(value)) return value.flatMap(walkValue);
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;

    const image = asImage(o);
    if (image)
      return [
        {
          kind: "html",
          value: `<img src="${escapeAttr(image.url)}" alt="${escapeAttr(image.alt)}" />`,
        },
      ];

    const link = asLink(o);
    if (link)
      return [
        {
          kind: "html",
          value: `<a href="${escapeAttr(link.url)}">${escapeText(link.label)}</a>`,
        },
      ];

    return Object.entries(o)
      .filter(([key]) => !SKIP_KEYS.has(key))
      .flatMap(([, v]) => walkValue(v));
  }

  return [];
}
