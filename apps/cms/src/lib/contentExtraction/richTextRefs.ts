import type { LinkRef, LinkRelation } from "./links";

type Id = string | number;

function isId(v: unknown): v is Id {
  return typeof v === "number" || typeof v === "string";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function docId(v: unknown): Id | null {
  if (isId(v)) return v;
  if (isRecord(v) && isId(v.id)) return v.id;
  return null;
}

export interface RichTextRefs {
  media: Id[];
  links: LinkRef[];
}

export function collectRichTextRefs(value: unknown): RichTextRefs {
  const media = new Set<Id>();
  const links: LinkRef[] = [];
  const seen = new Set<string>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!isRecord(node)) return;

    if (node.type === "upload" && node.relationTo === "media") {
      const id = docId(node.value);
      if (id != null) media.add(id);
    }

    if ((node.type === "link" || node.type === "autolink") && isRecord(node.fields)) {
      const doc = node.fields.doc;
      if (isRecord(doc) && (doc.relationTo === "page" || doc.relationTo === "posts")) {
        const id = docId(doc.value);
        if (id != null) {
          const key = `${doc.relationTo}:${id}`;
          if (!seen.has(key)) {
            seen.add(key);
            links.push({ collection: doc.relationTo as LinkRelation, id });
          }
        }
      }
    }

    for (const child of Object.values(node)) visit(child);
  };

  visit(value);

  return { media: [...media], links };
}
