import type { AuditTarget } from "../types";

export function auditTarget(
  kind: AuditTarget["kind"],
  slug: string,
  docId?: unknown,
  label?: string
): AuditTarget {
  const target: AuditTarget = { kind, slug };
  if (docId !== undefined && docId !== null) target.docId = String(docId);
  if (label) target.label = label;
  return target;
}

export const inLocale = (target: AuditTarget, locale: unknown): AuditTarget =>
  typeof locale === "string" ? { ...target, locale } : target;
