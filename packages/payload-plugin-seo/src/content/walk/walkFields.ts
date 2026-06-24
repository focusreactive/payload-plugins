import type { ClientBlock, ClientField } from "payload";

export interface FieldVisitContext {
  isUploadCollection: (slug: string) => boolean;
  blocksBySlug: Record<string, ClientBlock>;
}

export interface FieldVisit {
  field: ClientField;
  value: unknown;
  path: string;
}

type Values = Record<string, unknown>;
type Visit = (v: FieldVisit) => void;

function isRecord(v: unknown): v is Values {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function join(path: string, key: string | number): string {
  return path ? `${path}.${key}` : String(key);
}

function blockDef(field: { blocks?: ClientBlock[]; blockReferences?: (ClientBlock | string)[] }, slug: string, ctx: FieldVisitContext): ClientBlock | undefined {
  const inline = field.blocks?.find((b) => b.slug === slug);
  if (inline) return inline;
  const ref = field.blockReferences?.find((r) => (typeof r === "string" ? r === slug : r.slug === slug));
  if (ref) return typeof ref === "string" ? ctx.blocksBySlug[ref] : ref;
  return ctx.blocksBySlug[slug];
}

export function walkFields(values: Values, fields: ClientField[], ctx: FieldVisitContext, visit: Visit, opts: { path?: string } = {}): void {
  const base = opts.path ?? "";

  for (const f of fields) {
    switch (f.type) {
      case "upload":
      case "relationship":
      case "richText": {
        if ("name" in f && typeof f.name === "string") visit({ field: f, value: values[f.name], path: join(base, f.name) });
        break;
      }
      case "array": {
        const v = values[f.name];
        if (Array.isArray(v))
          v.forEach(
            (item, i) =>
              isRecord(item) &&
              walkFields(item, f.fields, ctx, visit, {
                path: join(base, `${f.name}.${i}`),
              })
          );
        break;
      }
      case "blocks": {
        const v = values[f.name];
        if (Array.isArray(v)) {
          v.forEach((item, i) => {
            if (!(isRecord(item) && typeof item.blockType === "string")) return;
            const def = blockDef(f, item.blockType, ctx);
            if (def)
              walkFields(item, def.fields, ctx, visit, {
                path: join(base, `${f.name}.${i}`),
              });
          });
        }
        break;
      }
      case "group": {
        if ("name" in f && typeof f.name === "string") {
          const v = values[f.name];
          if (isRecord(v)) walkFields(v, f.fields, ctx, visit, { path: join(base, f.name) });
        } else {
          walkFields(values, f.fields, ctx, visit, { path: base });
        }
        break;
      }
      case "row":
      case "collapsible":
        walkFields(values, f.fields, ctx, visit, { path: base });
        break;
      case "tabs": {
        for (const tab of f.tabs) {
          if ("name" in tab && typeof tab.name === "string") {
            const v = values[tab.name];
            if (isRecord(v))
              walkFields(v, tab.fields, ctx, visit, {
                path: join(base, tab.name),
              });
          } else {
            walkFields(values, tab.fields, ctx, visit, { path: base });
          }
        }
        break;
      }
      default:
        break;
    }
  }
}
