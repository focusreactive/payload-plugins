import type { ContentNode } from "../schema/nodes";
import { image, link, paragraph, richText } from "../schema/helpers";

const SKIP_KEYS = new Set(["id", "blockType", "blockName", "_template", "order"]);
const EMPTY = new Set<string>();

function isLexical(v: unknown): v is { root?: unknown } {
  return typeof v === "object" && v !== null && "root" in (v as Record<string, unknown>);
}

function nonEmptyString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function asImage(o: Record<string, unknown>): { url: string; alt: string } | undefined {
  const url = nonEmptyString(o.url);
  const mime = nonEmptyString(o.mimeType);

  if (url && mime?.startsWith("image/")) {
    return {
      url,
      alt: nonEmptyString(o.alt) ?? "",
    };
  }

  return undefined;
}

function asLink(o: Record<string, unknown>): { url: string; label: string } | undefined {
  const url = nonEmptyString(o.url);
  if (!url) return undefined;

  const label = nonEmptyString(o.label) ?? nonEmptyString(o.text) ?? nonEmptyString(o.title);

  return label ? { url, label } : undefined;
}

export interface WalkOpts {
  excluded?: Set<string>;
  path?: string;
}

export function walkValue(value: unknown, opts: WalkOpts = {}): ContentNode[] {
  const excluded = opts.excluded ?? EMPTY;
  const path = opts.path ?? "";

  if (typeof value === "string") {
    const n = paragraph(value);
    return n ? [n] : [];
  }
  if (isLexical(value)) {
    const n = richText(value);
    return n ? [n] : [];
  }
  if (Array.isArray(value)) return value.flatMap((v) => walkValue(v, { excluded, path }));
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;

    const img = asImage(o);
    if (img) {
      const n = image(img.url, img.alt);
      return n ? [n] : [];
    }
    const lnk = asLink(o);
    if (lnk) {
      const n = link(lnk.url, lnk.label);
      return n ? [n] : [];
    }

    return Object.entries(o)
      .filter(([key]) => !SKIP_KEYS.has(key))
      .flatMap(([key, v]) => {
        const childPath = path ? `${path}.${key}` : key;
        if (excluded.has(childPath)) return [];
        return walkValue(v, { excluded, path: childPath });
      });
  }
  return [];
}
