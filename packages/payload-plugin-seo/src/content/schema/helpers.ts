import { lexicalToHtml } from "../lexicalToHtml";
import type { ContentNode, HeadingLevel } from "./nodes";

function clean(v?: string | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? v : undefined;
}

export function heading(level: HeadingLevel, text?: string | null): ContentNode | null {
  const t = clean(text);
  return t ? { type: "heading", level, text: t } : null;
}

export function paragraph(text?: string | null): ContentNode | null {
  const t = clean(text);
  return t ? { type: "paragraph", text: t } : null;
}

export function link(href?: string | null, text?: string | null): ContentNode | null {
  const h = clean(href);
  const t = clean(text);
  return h && t ? { type: "link", href: h, text: t } : null;
}

export function image(src?: string | null, alt?: string | null): ContentNode | null {
  const s = clean(src);
  return s ? { type: "image", src: s, alt: clean(alt) ?? "" } : null;
}

export function video(src?: string | null, poster?: string | null): ContentNode | null {
  const s = clean(src);
  if (!s) return null;
  const p = clean(poster);
  return p ? { type: "video", src: s, poster: p } : { type: "video", src: s };
}

function hasLexicalContent(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const root = (value as Record<string, unknown>).root;
  if (typeof root !== "object" || root === null) return false;
  const children = (root as Record<string, unknown>).children;
  return Array.isArray(children) && children.length > 0;
}

export function richText(value: unknown): ContentNode | null {
  if (!hasLexicalContent(value)) return null;
  const out = lexicalToHtml(value as never);
  return out ? { type: "html", html: out } : null;
}

export function html(raw?: string | null): ContentNode | null {
  const r = clean(raw);
  return r ? { type: "html", html: r } : null;
}
