import type { ClientBlock, ClientField } from "payload";
import type { FieldVisitContext } from "../walk/walkFields";
import { refKey } from "./types";
import type { ResolvedDoc } from "./types";

type Values = Record<string, unknown>;

function isRecord(v: unknown): v is Values {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isId(v: unknown): v is string | number {
  return typeof v === "string" || typeof v === "number";
}
function renderable(doc: ResolvedDoc): boolean {
  return typeof doc.url === "string" && typeof doc.mimeType === "string";
}

function pick(collection: string, id: string | number, isUpload: boolean, resolved: Map<string, ResolvedDoc>): ResolvedDoc | null {
  const doc = resolved.get(refKey({ collection, id }));
  if (!doc) return null;
  return isUpload ? (renderable(doc) ? doc : null) : doc;
}

function relationValue(value: unknown, relationTo: string | string[], ctx: FieldVisitContext, resolved: Map<string, ResolvedDoc>): unknown {
  if (Array.isArray(value)) return value.map((v) => relationValue(v, relationTo, ctx, resolved));
  if (typeof relationTo === "string") {
    if (!isId(value)) return value;
    return pick(relationTo, value, ctx.isUploadCollection(relationTo), resolved);
  }
  if (isRecord(value) && typeof value.relationTo === "string" && isId(value.value)) {
    return pick(value.relationTo, value.value, ctx.isUploadCollection(value.relationTo), resolved);
  }
  return value;
}

function hydrateLexical(value: Values, resolved: Map<string, ResolvedDoc>): Values {
  const node = (n: unknown): unknown => {
    if (!isRecord(n)) return n;
    if (n.type === "upload" && typeof n.relationTo === "string" && isId(n.value)) {
      const doc = resolved.get(refKey({ collection: n.relationTo, id: n.value as string | number }));
      return doc ? { ...n, value: doc } : n;
    }
    if (Array.isArray(n.children)) return { ...n, children: (n.children as unknown[]).map(node) };
    return n;
  };
  return { ...value, root: node((value as { root?: unknown }).root) };
}

function blockDef(field: { blocks?: ClientBlock[]; blockReferences?: (ClientBlock | string)[] }, slug: string, ctx: FieldVisitContext): ClientBlock | undefined {
  const inline = field.blocks?.find((b) => b.slug === slug);
  if (inline) return inline;
  const ref = field.blockReferences?.find((r) => (typeof r === "string" ? r === slug : r.slug === slug));
  if (ref) return typeof ref === "string" ? ctx.blocksBySlug[ref] : ref;
  return ctx.blocksBySlug[slug];
}

export function hydrate(values: Values, fields: ClientField[], ctx: FieldVisitContext, resolved: Map<string, ResolvedDoc>): Values {
  const out: Values = { ...values };
  for (const f of fields) {
    switch (f.type) {
      case "upload":
      case "relationship": {
        const v = out[(f as { name: string }).name];
        if (v !== undefined && v !== null) out[(f as { name: string }).name] = relationValue(v, (f as { relationTo: string | string[] }).relationTo, ctx, resolved);
        break;
      }
      case "richText": {
        const v = out[(f as { name: string }).name];
        if (isRecord(v) && "root" in v) out[(f as { name: string }).name] = hydrateLexical(v, resolved);
        break;
      }
      case "array": {
        const v = out[f.name];
        if (Array.isArray(v)) out[f.name] = v.map((item) => (isRecord(item) ? hydrate(item, f.fields, ctx, resolved) : item));
        break;
      }
      case "blocks": {
        const v = out[f.name];
        if (Array.isArray(v)) {
          out[f.name] = v.map((item) => {
            if (!(isRecord(item) && typeof item.blockType === "string")) return item;
            const def = blockDef(f, item.blockType, ctx);
            return def ? hydrate(item, def.fields, ctx, resolved) : item;
          });
        }
        break;
      }
      case "group": {
        if ("name" in f && typeof f.name === "string") {
          const v = out[f.name];
          if (isRecord(v)) out[f.name] = hydrate(v, f.fields, ctx, resolved);
        } else {
          Object.assign(out, hydrate(out, f.fields, ctx, resolved));
        }
        break;
      }
      case "row":
      case "collapsible":
        Object.assign(out, hydrate(out, f.fields, ctx, resolved));
        break;
      case "tabs": {
        for (const tab of f.tabs) {
          if ("name" in tab && typeof tab.name === "string") {
            const v = out[tab.name];
            if (isRecord(v)) out[tab.name] = hydrate(v, tab.fields, ctx, resolved);
          } else {
            Object.assign(out, hydrate(out, tab.fields, ctx, resolved));
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return out;
}
