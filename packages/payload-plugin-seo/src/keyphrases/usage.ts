import { formatAdminURL } from "payload/shared";

export interface UsageDoc {
  collection: string;
  id: string;
  title: string;
}

export function adminDocHref(adminRoute: string, doc: Pick<UsageDoc, "collection" | "id">): string {
  return formatAdminURL({ adminRoute, path: `/collections/${doc.collection}/${doc.id}` });
}

const DOC_IDENTITY_KEYS = ["collection", "id", "title"] as const;

export function hasDocIdentity(value: unknown): value is UsageDoc {
  if (typeof value !== "object" || value === null) return false;

  const item: Record<string, unknown> = { ...value };

  return DOC_IDENTITY_KEYS.every((key) => typeof item[key] === "string");
}
