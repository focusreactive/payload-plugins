import type { ExtractContext } from "../extract/context";
import { refKey } from "../resolve/types";
import type { ResolvedDoc } from "../resolve/types";

interface LexicalNode {
  type?: unknown;
  children?: unknown;
  relationTo?: unknown;
  value?: unknown;
  fields?: unknown;
  [key: string]: unknown;
}

function isNode(v: unknown): v is LexicalNode {
  return typeof v === "object" && v !== null;
}
function isId(v: unknown): v is string | number {
  return typeof v === "string" || typeof v === "number";
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function uploadValue(node: LexicalNode, ctx: ExtractContext): ResolvedDoc | undefined {
  if (node.type !== "upload" || typeof node.relationTo !== "string" || !isId(node.value)) return undefined;
  return ctx.resolved.get(refKey({ collection: node.relationTo, id: node.value }));
}

function internalLinkUrl(node: LexicalNode, ctx: ExtractContext): string | undefined {
  const fields = node.fields;
  if (!(isNode(fields) && fields.linkType === "internal" && isNode(fields.doc))) return undefined;

  const doc = fields.doc as LexicalNode;
  if (typeof doc.relationTo !== "string" || !isId(doc.value)) return undefined;

  const resolved = ctx.resolved.get(refKey({ collection: doc.relationTo, id: doc.value }));

  const slug = resolved ? str(resolved[ctx.slugPath(doc.relationTo)]) : undefined;

  return slug ? `${ctx.baseUrl}/${slug}` : undefined;
}

function transformNode(node: LexicalNode, ctx: ExtractContext): LexicalNode {
  let next = node;

  const upload = uploadValue(node, ctx);
  if (upload) {
    next = { ...next, value: upload };
  } else {
    const url = internalLinkUrl(node, ctx);

    if (url)
      next = {
        ...next,
        fields: { ...(next.fields as object), linkType: "custom", url },
      };
  }

  if (Array.isArray(next.children)) {
    next = {
      ...next,
      children: next.children.map((c) => (isNode(c) ? transformNode(c, ctx) : c)),
    };
  }

  return next;
}

export function transformLexical<T extends { root?: unknown }>(value: T, ctx: ExtractContext): T {
  if (!isNode(value.root)) return value;

  return { ...value, root: transformNode(value.root, ctx) };
}
