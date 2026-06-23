import type { ClientBlock, ClientField } from "payload";
import { transformLexicalUploads } from "./transform-lexical-uploads";
import type { UploadTransform } from "./types";

export interface UploadWalkContext {
  isUploadCollection: (slug: string) => boolean;
  blocksBySlug: Record<string, ClientBlock>;
}

type Values = Record<string, unknown>;

function isRecord(v: unknown): v is Values {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isId(v: unknown): v is string | number {
  return typeof v === "string" || typeof v === "number";
}

function transformRelationValue(value: unknown, relationTo: string | string[], ctx: UploadWalkContext, transform: UploadTransform): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => transformRelationValue(item, relationTo, ctx, transform));
  }

  if (typeof relationTo === "string") {
    if (!(isId(value) && ctx.isUploadCollection(relationTo))) return value;
    const replaced = transform({ collection: relationTo, id: value });

    return replaced === undefined ? value : replaced;
  }

  if (isRecord(value) && typeof value.relationTo === "string" && isId(value.value) && ctx.isUploadCollection(value.relationTo)) {
    const replaced = transform({
      collection: value.relationTo,
      id: value.value,
    });

    return replaced === undefined ? value : replaced;
  }

  return value;
}

function blockDef(
  field: {
    blocks?: ClientBlock[];
    blockReferences?: (ClientBlock | string)[];
  },
  slug: string,
  ctx: UploadWalkContext
): ClientBlock | undefined {
  const inline = field.blocks?.find((b) => b.slug === slug);
  if (inline) return inline;

  const ref = field.blockReferences?.find((r) => (typeof r === "string" ? r === slug : r.slug === slug));
  if (ref) return typeof ref === "string" ? ctx.blocksBySlug[ref] : ref;

  return ctx.blocksBySlug[slug];
}

export function transformUploadValues(values: Values, fields: ClientField[], ctx: UploadWalkContext, transform: UploadTransform): Values {
  const out: Values = { ...values };

  for (const f of fields) {
    switch (f.type) {
      case "upload":
      case "relationship": {
        const v = out[f.name];
        if (v !== undefined && v !== null) out[f.name] = transformRelationValue(v, f.relationTo, ctx, transform);
        break;
      }
      case "richText": {
        const v = out[f.name];
        if (isRecord(v) && "root" in v) out[f.name] = transformLexicalUploads(v, transform);
        break;
      }
      case "array": {
        const v = out[f.name];
        if (Array.isArray(v)) {
          out[f.name] = v.map((item) => (isRecord(item) ? transformUploadValues(item, f.fields, ctx, transform) : item));
        }
        break;
      }
      case "blocks": {
        const v = out[f.name];
        if (Array.isArray(v)) {
          out[f.name] = v.map((item) => {
            if (!(isRecord(item) && typeof item.blockType === "string")) return item;
            const def = blockDef(f, item.blockType, ctx);

            return def ? transformUploadValues(item, def.fields, ctx, transform) : item;
          });
        }
        break;
      }
      case "group": {
        if ("name" in f && typeof f.name === "string") {
          const v = out[f.name];
          if (isRecord(v)) out[f.name] = transformUploadValues(v, f.fields, ctx, transform);
        } else {
          Object.assign(out, transformUploadValues(out, f.fields, ctx, transform));
        }
        break;
      }
      case "row":
      case "collapsible": {
        Object.assign(out, transformUploadValues(out, f.fields, ctx, transform));
        break;
      }
      case "tabs": {
        for (const tab of f.tabs) {
          if ("name" in tab && typeof tab.name === "string") {
            const v = out[tab.name];
            if (isRecord(v)) out[tab.name] = transformUploadValues(v, tab.fields, ctx, transform);
          } else {
            Object.assign(out, transformUploadValues(out, tab.fields, ctx, transform));
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
