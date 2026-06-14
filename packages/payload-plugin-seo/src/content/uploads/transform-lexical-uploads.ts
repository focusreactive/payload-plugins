import type { UploadRef, UploadTransform } from "./types";

interface LexicalNode {
  type?: unknown;
  children?: unknown;
  relationTo?: unknown;
  value?: unknown;
  [key: string]: unknown;
}

function isNode(v: unknown): v is LexicalNode {
  return typeof v === "object" && v !== null;
}

function uploadRefOf(node: LexicalNode): UploadRef | undefined {
  if (node.type !== "upload" || typeof node.relationTo !== "string") return undefined;
  if (typeof node.value === "string" || typeof node.value === "number") {
    return { collection: node.relationTo, id: node.value };
  }

  return undefined;
}

function transformNode(node: LexicalNode, transform: UploadTransform): LexicalNode {
  const ref = uploadRefOf(node);
  if (ref) {
    const replaced = transform(ref);

    return replaced === undefined ? node : { ...node, value: replaced };
  }
  if (Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) => (isNode(child) ? transformNode(child, transform) : child)),
    };
  }

  return node;
}

export function transformLexicalUploads<T extends { root?: unknown }>(value: T, transform: UploadTransform): T {
  if (!isNode(value.root)) return value;

  return { ...value, root: transformNode(value.root, transform) };
}
