import type { ClientField } from "payload";
import { walkFields } from "../walk/walkFields";
import type { FieldVisitContext } from "../walk/walkFields";
import { refKey } from "./types";
import type { DocRef } from "./types";

type Values = Record<string, unknown>;

function isId(v: unknown): v is string | number {
  return typeof v === "string" || typeof v === "number";
}
function isRecord(v: unknown): v is Values {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function kindOf(collection: string, isUpload: (s: string) => boolean): DocRef {
  return {
    collection,
    id: 0,
    kind: isUpload(collection) ? "upload" : "relationship",
  };
}

function relationRefs(value: unknown, relationTo: string | string[], isUpload: (s: string) => boolean): DocRef[] {
  if (Array.isArray(value)) return value.flatMap((v) => relationRefs(v, relationTo, isUpload));

  if (typeof relationTo === "string") {
    if (!isId(value)) return [];

    return [{ ...kindOf(relationTo, isUpload), id: value }];
  }
  if (isRecord(value) && typeof value.relationTo === "string" && isId(value.value)) {
    return [{ ...kindOf(value.relationTo, isUpload), id: value.value }];
  }
  return [];
}

export function lexicalDocRefs(root: unknown, isUpload: (s: string) => boolean): DocRef[] {
  const out: DocRef[] = [];

  const visit = (node: unknown): void => {
    if (!isRecord(node)) return;
    if (node.type === "upload" && typeof node.relationTo === "string" && isId(node.value)) {
      out.push({ ...kindOf(node.relationTo, isUpload), id: node.value });
    }
    const fields = node.fields;
    if (isRecord(fields) && fields.linkType === "internal" && isRecord(fields.doc) && typeof fields.doc.relationTo === "string" && isId(fields.doc.value)) {
      out.push({
        ...kindOf(fields.doc.relationTo, isUpload),
        id: fields.doc.value,
      });
    }
    if (Array.isArray(node.children)) node.children.forEach(visit);
  };

  visit(root);

  return out;
}

export function collectRefs(values: Values, fields: ClientField[], ctx: FieldVisitContext, excluded: (path: string) => boolean): DocRef[] {
  const seen = new Set<string>();
  const refs: DocRef[] = [];

  const push = (r: DocRef) => {
    const k = refKey(r);
    if (!seen.has(k)) {
      seen.add(k);
      refs.push(r);
    }
  };

  walkFields(values, fields, ctx, ({ field, value, path }) => {
    if (excluded(path)) return;
    if (field.type === "richText") {
      if (isRecord(value) && isRecord(value.root)) lexicalDocRefs(value.root, ctx.isUploadCollection).forEach(push);
      return;
    }
    if (value == null) return;
    const f = field as unknown as { relationTo: string | string[] };
    relationRefs(value, f.relationTo, ctx.isUploadCollection).forEach(push);
  });

  return refs;
}
