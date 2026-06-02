import type { CollectionSlug, PayloadRequest, TypedLocale } from "payload";
import type { ResolvedAbConfig } from "../../config/resolveAbConfig";
import { AB_CONTROL_BUCKET } from "../../constants/ab";

export interface BucketMeta {
  configuredShare: number | null;
  name: string | null;
}

function readPath(doc: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];

    return undefined;
  }, doc);
}

export async function getExperimentBucketMeta(
  parentCollection: string,
  parentDocId: string,
  locale: string | undefined,
  ab: ResolvedAbConfig,
  req: PayloadRequest
): Promise<Record<string, BucketMeta>> {
  const { payload } = req;
  const variantFields = ab.variantFields;

  const { docs } = await payload.find({
    collection: parentCollection as CollectionSlug,
    where: { [variantFields.variantOf]: { equals: parentDocId } },
    draft: false,
    depth: 0,
    limit: 100,
    locale: locale as TypedLocale | undefined,
    overrideAccess: true,
    req,
  });

  const out: Record<string, BucketMeta> = {};
  let variantShareSum = 0;

  for (const doc of docs as Array<Record<string, unknown>>) {
    const slug = String(readPath(doc, variantFields.slug) ?? "");
    if (!slug) continue;

    const pct = Number(readPath(doc, variantFields.passPercentage) ?? 0);
    const share = Number.isFinite(pct) ? pct / 100 : null;
    if (share != null) variantShareSum += share;

    const rawName = readPath(doc, variantFields.name);
    const name = typeof rawName === "string" && rawName.trim() ? rawName : slug;

    out[slug] = { configuredShare: share, name };
  }

  out[AB_CONTROL_BUCKET] = {
    configuredShare: Math.max(0, 1 - variantShareSum),
    name: null,
  };

  return out;
}
