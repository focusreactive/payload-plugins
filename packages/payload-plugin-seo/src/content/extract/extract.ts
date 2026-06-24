import type { ClientBlock, ClientField } from "payload";
import { lexicalToHtml } from "../lexicalToHtml";
import { transformLexical } from "../lexical/transform";
import type { ContentNode } from "../schema/nodes";
import { html, image, link, paragraph, video } from "../schema/helpers";
import type { ResolvedDoc } from "../resolve/types";
import { refKey } from "../resolve/types";
import type { ExtractContext } from "./context";
import { makeExcluded, makeIncluded } from "./selection";

type Values = Record<string, unknown>;

export interface ExtractArgs {
  values: Values;
  fields: ClientField[];
  ctx: ExtractContext;
  selection: { include: string[]; exclude: string[] };
  metadataPaths: string[];
  depth: number;
}

function isRecord(v: unknown): v is Values {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isId(v: unknown): v is string | number {
  return typeof v === "string" || typeof v === "number";
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function mediaNode(doc: ResolvedDoc): ContentNode | null {
  const url = str(doc.url);
  const mime = str(doc.mimeType);

  if (!url) return null;
  if (mime?.startsWith("image/")) return image(url, str(doc.alt) ?? "");
  if (mime?.startsWith("video/")) return video(url);

  return link(url, str(doc.filename) ?? str(doc.title) ?? url);
}

function uploadDoc(value: unknown, relationTo: string | string[], ctx: ExtractContext): ResolvedDoc | null {
  if (isRecord(value) && str(value.url)) return value;

  if (isRecord(value) && isRecord(value.value) && str((value.value as ResolvedDoc).url)) {
    return value.value as ResolvedDoc;
  }

  if (typeof relationTo === "string" && isId(value)) {
    return ctx.resolved.get(refKey({ collection: relationTo, id: value })) ?? null;
  }

  if (isRecord(value) && typeof value.relationTo === "string" && isId(value.value)) {
    return ctx.resolved.get(refKey({ collection: value.relationTo, id: value.value })) ?? null;
  }

  return null;
}

function uploadNodes(value: unknown, relationTo: string | string[], ctx: ExtractContext): ContentNode[] {
  const list = Array.isArray(value) ? value : [value];

  return list.flatMap((v) => {
    const doc = uploadDoc(v, relationTo, ctx);
    const node = doc ? mediaNode(doc) : null;

    return node ? [node] : [];
  });
}

function join(path: string, key: string | number): string {
  return path ? `${path}.${key}` : String(key);
}

function blockDef(field: { blocks?: ClientBlock[]; blockReferences?: (ClientBlock | string)[] }, slug: string, ctx: ExtractContext): ClientBlock | undefined {
  const inline = field.blocks?.find((b) => b.slug === slug);
  if (inline) return inline;
  const ref = field.blockReferences?.find((r) => (typeof r === "string" ? r === slug : r.slug === slug));
  if (ref) return typeof ref === "string" ? ctx.blocksBySlug[ref] : ref;
  return ctx.blocksBySlug[slug];
}

export function extractContent(args: ExtractArgs): ContentNode[] {
  const { values, fields, ctx, depth } = args;

  const excluded = makeExcluded(args.metadataPaths, args.selection.exclude);
  const included = makeIncluded(args.selection.include);

  const out: ContentNode[] = [];

  const keepHost = (path: string) => included(path) && !excluded(path);

  walk(values, fields, "", depth, keepHost);

  return out;

  function relatedDoc(value: unknown, relationTo: string | string[]): { doc: Values; collection: string } | null {
    if (isRecord(value) && typeof relationTo === "string" && !("relationTo" in value && "value" in value)) {
      return { doc: value, collection: relationTo };
    }
    if (isRecord(value) && typeof value.relationTo === "string" && isRecord(value.value)) return { doc: value.value, collection: value.relationTo };
    if (typeof relationTo === "string" && isId(value)) {
      const doc = ctx.resolved.get(refKey({ collection: relationTo, id: value }));
      return doc ? { doc, collection: relationTo } : null;
    }
    if (isRecord(value) && typeof value.relationTo === "string" && isId(value.value)) {
      const doc = ctx.resolved.get(refKey({ collection: value.relationTo, id: value.value }));
      return doc ? { doc, collection: value.relationTo } : null;
    }
    return null;
  }

  function followRelationship(value: unknown, relationTo: string | string[], depthLeft: number): void {
    const list = Array.isArray(value) ? value : [value];
    for (const v of list) {
      const r = relatedDoc(v, relationTo);
      if (r) walk(r.doc, ctx.getFields(r.collection), "", depthLeft - 1, () => true);
    }
  }

  function walk(vals: Values, flds: ClientField[], base: string, depthLeft: number, keep: (path: string) => boolean): void {
    for (const f of flds) {
      switch (f.type) {
        case "text":
        case "textarea": {
          if ("name" in f && typeof f.name === "string" && keep(join(base, f.name))) {
            const n = paragraph(str(vals[f.name]));
            if (n) out.push(n);
          }
          break;
        }
        case "upload": {
          if ("name" in f && typeof f.name === "string" && keep(join(base, f.name))) out.push(...uploadNodes(vals[f.name], (f as { relationTo: string | string[] }).relationTo, ctx));
          break;
        }
        case "relationship": {
          if (depthLeft >= 1 && "name" in f && typeof f.name === "string" && keep(join(base, f.name))) {
            const v = vals[f.name];
            if (v != null) followRelationship(v, (f as { relationTo: string | string[] }).relationTo, depthLeft);
          }
          break;
        }
        case "richText": {
          if ("name" in f && typeof f.name === "string" && keep(join(base, f.name))) {
            const v = vals[f.name];
            if (isRecord(v) && "root" in v) {
              const n = html(
                lexicalToHtml(
                  transformLexical(v as { root: never }, ctx) as {
                    root: never;
                  }
                )
              );
              if (n) out.push(n);
            }
          }
          break;
        }
        case "array": {
          const v = vals[f.name];
          if (Array.isArray(v)) v.forEach((item, i) => isRecord(item) && walk(item, f.fields, join(base, `${f.name}.${i}`), depthLeft, keep));
          break;
        }
        case "blocks": {
          const v = vals[f.name];
          if (Array.isArray(v)) v.forEach((item, i) => walkBlock(item, f, join(base, `${f.name}.${i}`), depthLeft, keep));
          break;
        }
        case "group": {
          if ("name" in f && typeof f.name === "string") {
            const v = vals[f.name];
            if (isRecord(v)) walk(v, f.fields, join(base, f.name), depthLeft, keep);
          } else {
            walk(vals, f.fields, base, depthLeft, keep);
          }
          break;
        }
        case "row":
        case "collapsible":
          walk(vals, f.fields, base, depthLeft, keep);
          break;
        case "tabs": {
          for (const tab of f.tabs) {
            if ("name" in tab && typeof tab.name === "string") {
              const v = vals[tab.name];
              if (isRecord(v)) walk(v, tab.fields, join(base, tab.name), depthLeft, keep);
            } else {
              walk(vals, tab.fields, base, depthLeft, keep);
            }
          }
          break;
        }
        default:
          break;
      }
    }
  }

  function walkBlock(item: unknown, f: { blocks?: ClientBlock[]; blockReferences?: (ClientBlock | string)[] }, path: string, depthLeft: number, keep: (path: string) => boolean): void {
    if (!(isRecord(item) && typeof item.blockType === "string")) return;
    const def = blockDef(f, item.blockType, ctx);
    if (def) walk(item, def.fields, path, depthLeft, keep);
  }
}
