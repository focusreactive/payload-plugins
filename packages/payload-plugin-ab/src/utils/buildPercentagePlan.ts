import { AB_PASS_PERCENTAGE_FIELD } from "../constants";

export interface VariantPercentageEntry {
  variantId: string;
  desired: number;
  draftPercentage: number;
  publishedPercentage: number | null;
  isDirty: boolean;
}

export interface PercentagePlan {
  entries: VariantPercentageEntry[];
  total: number;
}

function readPercentage(doc: Record<string, unknown>): number {
  const value = doc[AB_PASS_PERCENTAGE_FIELD];

  return typeof value === "number" ? value : 0;
}

export function buildPercentagePlan({
  pending,
  draftDocs,
  publishedDocs,
}: {
  pending: Record<string, unknown>;
  draftDocs: Record<string, unknown>[];
  publishedDocs: Record<string, unknown>[];
}): PercentagePlan {
  const publishedById = new Map(
    publishedDocs
      .filter((doc) => doc._status === "published")
      .map((doc) => [String(doc.id), doc] as const)
  );

  const entries: VariantPercentageEntry[] = [];
  let total = 0;

  for (const draftDoc of draftDocs) {
    const variantId = String(draftDoc.id);
    const draftPercentage = readPercentage(draftDoc);
    const override = pending[variantId];
    const desired = typeof override === "number" ? override : draftPercentage;
    total += desired;

    const publishedDoc = publishedById.get(variantId);
    const publishedPercentage = publishedDoc ? readPercentage(publishedDoc) : null;

    const draftMatches = desired === draftPercentage;
    const publishedMatches = publishedPercentage === null || desired === publishedPercentage;
    if (draftMatches && publishedMatches) continue;

    entries.push({
      variantId,
      desired,
      draftPercentage,
      publishedPercentage,
      isDirty: draftDoc._status === "draft",
    });
  }

  return { entries, total };
}
