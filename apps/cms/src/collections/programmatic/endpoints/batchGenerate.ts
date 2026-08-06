import type { Endpoint, PayloadRequest } from "payload";

import { getSoleRelationId } from "@/dal/getSoleRelationId";

import { MODEL, generateValidatedNarrative, generationInputs, pageSlug, pageTitle } from './narrativeGeneration';
import type { CityData, ConditionData } from './narrativeGeneration';

/**
 * Batch generation with a visible quality gate.
 *
 * The client's objection to unattended generation was not "can it make many
 * pages" - they already drive that from their own pipeline - it was "if we
 * create a thousand pages nobody checks them one by one, so it should be
 * managed by the system by design". So this endpoint exists to make the
 * checking visible: every page is validated, a short one is retried once, and
 * anything still failing is reported and NOT created rather than quietly
 * written as a stub.
 *
 * Results stream as NDJSON because a real run is a minute or more of model
 * calls - a buffered response would look frozen exactly when the point is that
 * work is being done and checked.
 */

// Enough to keep a demo moving without tripping gateway rate limits mid-run.
const CONCURRENCY = 3;

interface BatchBody {
  axis?: "city" | "condition";
  entityId?: number | string;
}

interface PlannedPage {
  condition: ConditionData;
  city: CityData;
  slug: string;
}

function json(data: unknown, status: number): Response {
  return Response.json(data, { status });
}

async function planMissingPages(
  req: PayloadRequest,
  axis: "city" | "condition",
  entityId: number | string
): Promise<{ anchorLabel: string; planned: PlannedPage[]; existingCount: number } | null> {
  const anchorCollection = axis === "city" ? "cities" : "conditions";
  const counterpartCollection = axis === "city" ? "conditions" : "cities";

  const anchor = await req.payload
    .findByID({ collection: anchorCollection, id: entityId, depth: 0 })
    .catch(() => null);

  if (!anchor) return null;

  const counterparts = await req.payload.find({
    collection: counterpartCollection,
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  });

  // Drafts count as existing: a pair already awaiting review must never be
  // generated a second time, which is the duplicate the single-page guard
  // catches interactively and a batch would otherwise create silently.
  const existing = await req.payload.find({
    collection: "generated-pages",
    depth: 0,
    draft: true,
    limit: 2000,
    overrideAccess: true,
    where: { [axis]: { equals: entityId } },
  });
  const takenSlugs = new Set(existing.docs.map((page) => page.slug).filter(Boolean));

  const planned: PlannedPage[] = [];
  for (const counterpart of counterparts.docs) {
    const condition = (axis === "city" ? counterpart : anchor) as ConditionData;
    const city = (axis === "city" ? anchor : counterpart) as CityData;
    const slug = pageSlug(condition, city);
    if (takenSlugs.has(slug)) continue;
    planned.push({ city, condition, slug });
  }

  return {
    anchorLabel: (anchor as { title?: string }).title ?? String(entityId),
    existingCount: takenSlugs.size,
    planned,
  };
}

async function createDraftPage(
  req: PayloadRequest,
  page: PlannedPage,
  narrative: string,
  headerId: number | null,
  footerId: number | null
): Promise<void> {
  await req.payload.create({
    collection: "generated-pages",
    // Both halves are required to land a draft. Without draft:true the
    // document is written straight to the live row.
    draft: true,
    overrideAccess: true,
    data: {
      _status: "draft",
      city: Number(page.city.id),
      condition: Number(page.condition.id),
      ...(footerId ? { footer: footerId } : {}),
      ...(headerId ? { header: headerId } : {}),
      narrative,
      provenance: {
        generatedAt: new Date().toISOString(),
        generationInputs: generationInputs(page.condition, page.city),
        generationModel: MODEL,
      },
      slug: page.slug,
      title: pageTitle(page.condition, page.city),
    },
  });
}

export const batchGenerateEndpoint: Endpoint = {
  method: "post",
  path: "/batch",
  handler: async (req: PayloadRequest): Promise<Response> => {
    if (!req.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = ((await req.json?.()) ?? {}) as BatchBody;
    const axis = body.axis === "condition" ? "condition" : "city";

    if (!body.entityId) {
      return json({ error: "Pick a city or a condition to generate for" }, 400);
    }

    const plan = await planMissingPages(req, axis, body.entityId);
    if (!plan) {
      return json({ error: "That city or condition no longer exists" }, 404);
    }
    if (plan.planned.length === 0) {
      return json(
        { error: `Every page for ${plan.anchorLabel} already exists - nothing to generate` },
        409
      );
    }

    // The collection's defaultValue does this same lookup, but a create() that
    // passes data does not run it, so the chrome has to be set explicitly or
    // the generated page renders with no header and no footer.
    const [soleHeaderId, soleFooterId] = await Promise.all([
      getSoleRelationId("header").catch(() => null),
      getSoleRelationId("footer").catch(() => null),
    ]);
    const headerId = soleHeaderId === null ? null : Number(soleHeaderId);
    const footerId = soleFooterId === null ? null : Number(soleFooterId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        emit({
          anchor: plan.anchorLabel,
          axis,
          existing: plan.existingCount,
          total: plan.planned.length,
          type: "plan",
        });

        let created = 0;
        let retried = 0;
        let failed = 0;
        let nextIndex = 0;

        const runWorker = async (): Promise<void> => {
          while (nextIndex < plan.planned.length) {
            const page = plan.planned[nextIndex];
            nextIndex += 1;

            const outcome = await generateValidatedNarrative(page.condition, page.city);

            if (outcome.status === "failed") {
              failed += 1;
              emit({
                attempts: outcome.attempts,
                reason: outcome.reason,
                slug: page.slug,
                status: "failed",
                type: "item",
              });
              continue;
            }

            try {
              await createDraftPage(req, page, outcome.narrative, headerId, footerId);
            } catch (error) {
              failed += 1;
              emit({
                attempts: outcome.attempts,
                reason: (error as Error).message || "could not be saved",
                slug: page.slug,
                status: "failed",
                type: "item",
              });
              continue;
            }

            created += 1;
            if (outcome.attempts > 1) retried += 1;
            emit({
              attempts: outcome.attempts,
              slug: page.slug,
              status: outcome.attempts > 1 ? "retried" : "created",
              type: "item",
              wordCount: outcome.wordCount,
            });
          }
        };

        try {
          await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, plan.planned.length) }, runWorker)
          );
          emit({ created, failed, published: 0, retried, type: "summary" });
        } catch (error) {
          req.payload.logger.error(
            `generated-pages/batch failed: ${(error as Error).message ?? error}`
          );
          emit({ message: (error as Error).message || "Batch failed", type: "error" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    });
  },
};
