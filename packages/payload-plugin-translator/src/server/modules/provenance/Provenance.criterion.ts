import { driftedAddresses } from "../../../core/domain/provenance/index.js";
import type { ProvenanceKey } from "../../../core/domain/provenance/index.js";
import { TranslatorConfigError } from "../../../core/errors/index.js";
import type { Criterion, RunTarget } from "../translation-run/index.js";

import type { ProvenanceServiceFactory } from "./Provenance.wiring.js";

/**
 * The rule name a filter carries to ask for the leaves whose source has moved.
 *
 * `store/runTargets.ts` spells the same literal, for rows written before 1.0 — keep the two equal.
 */
export const DRIFT_CRITERION = "stale";

const receiptKey = (target: RunTarget): ProvenanceKey => ({
  collectionSlug: target.collection,
  documentId: String(target.documentId),
  targetLocale: target.targetLocale,
});

/**
 * Every leaf whose source moved since this locale was last translated. With nothing readable in the
 * receipt it answers every leaf — overwriting reviewed text is the accepted cost of enabling
 * provenance late.
 */
export const driftedLeaves =
  (serviceFactory: ProvenanceServiceFactory): Criterion =>
  async ({ payload, scope, target, sourceData }) => {
    const service = serviceFactory(payload, scope);
    const currentFields = service.captureFingerprint(target.collection, sourceData);
    if (currentFields === null) {
      throw new TranslatorConfigError(
        `Cannot tell what has moved in "${target.collection}": the collection has no schema here, so the run would translate the whole document instead.`
      );
    }

    const previous = await service.lastTranslatedFrom(receiptKey(target));
    if (previous === null) return Object.keys(currentFields);
    return driftedAddresses(previous, currentFields);
  };
