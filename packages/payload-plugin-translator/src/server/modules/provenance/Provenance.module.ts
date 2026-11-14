import type { FieldFingerprints } from "../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { ProvenanceKey } from "../../../core/domain/provenance/index.js";
import {
  createDismissStalenessRoute,
  createGetDocumentStalenessRoute,
} from "../../features/staleness/index.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { ModuleContext, TranslationModule } from "../plugin-config/index.js";
import type { BeforeTranslation, RunTarget } from "../translation-run/index.js";

import type { DocumentStalenessFactory, ProvenanceRecorderFactory } from "./Provenance.wiring.js";

export const PROVENANCE_MODULE = "provenance";

const isFingerprints = (recorded: unknown): recorded is FieldFingerprints => {
  if (typeof recorded !== "object" || recorded === null) return false;
  return Object.values(recorded).every((hash) => typeof hash === "string");
};

const receiptKey = (target: RunTarget): ProvenanceKey => ({
  collectionSlug: target.collection,
  documentId: String(target.documentId),
  targetLocale: target.targetLocale,
});

type ProvenanceModuleDeps = {
  recorderFactory: ProvenanceRecorderFactory;
  stalenessFactory: DocumentStalenessFactory;
  refuseACollidingSlug: ConfigModifier;
  addTheCollection: ConfigModifier;
  cleanUpOnDelete: (managedSlugs: Set<string>) => ConfigModifier;
};

/**
 * The source is fingerprinted before the provider is called and that value is what the receipt
 * records, so a pipeline writing into the document it was handed cannot change the receipt.
 */
export function provenanceModule({
  recorderFactory,
  stalenessFactory,
  refuseACollidingSlug,
  addTheCollection,
  cleanUpOnDelete,
}: ProvenanceModuleDeps): TranslationModule {
  return {
    name: PROVENANCE_MODULE,

    setup(ctx: ModuleContext) {
      const managedSlugs = new Set(ctx.collections.map((collection) => collection.slug));
      const config = {
        availableCollections: managedSlugs,
        stalenessFactory,
      };
      ctx.addEndpoints([
        createGetDocumentStalenessRoute(config, ctx.access, ctx.settings.basePath),
        createDismissStalenessRoute(config, ctx.access, ctx.settings.basePath),
      ]);
      // refuseACollidingSlug first: a collision must leave the host's config untouched.
      ctx.addConfigModifier(refuseACollidingSlug);
      ctx.addConfigModifier(addTheCollection);
      ctx.addConfigModifier(cleanUpOnDelete(managedSlugs));
    },

    async beforeTranslation(state: BeforeTranslation) {
      const recorder = recorderFactory(state.payload, state.scope);
      const currentFields = recorder.captureFingerprint(state.target.collection, state.sourceData);
      if (currentFields === null) return {};

      return { moduleState: { [PROVENANCE_MODULE]: currentFields } };
    },

    async afterSave(state) {
      const fingerprints = state.moduleState[PROVENANCE_MODULE];
      if (!isFingerprints(fingerprints)) return;

      const recorder = recorderFactory(state.payload, state.scope);
      await recorder.record(
        { ...receiptKey(state.target), sourceLocale: state.target.sourceLocale },
        fingerprints,
        state.leaves
      );
    },
  };
}
