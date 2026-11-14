import type { ConfigModifier } from "../../../../../types/ConfigModifier.js";
import type { ChainMember } from "../../../translation-run/index.js";
import { provenanceModule } from "../../Provenance.module.js";
import type {
  DocumentStalenessFactory,
  ProvenanceRecorderFactory,
} from "../../Provenance.wiring.js";

const UNCHANGED: ConfigModifier = (config) => config;

export const NO_PANEL_IN_THESE_CHECKS: DocumentStalenessFactory = () => {
  throw new Error("the panel half is not part of a translation chain");
};

export const provenanceInAChain = (
  recorderFactory: ProvenanceRecorderFactory,
  stalenessFactory: DocumentStalenessFactory = NO_PANEL_IN_THESE_CHECKS
): ChainMember[] => [
  provenanceModule({
    recorderFactory,
    stalenessFactory,
    refuseACollidingSlug: UNCHANGED,
    addTheCollection: UNCHANGED,
    cleanUpOnDelete: () => UNCHANGED,
  }),
];
