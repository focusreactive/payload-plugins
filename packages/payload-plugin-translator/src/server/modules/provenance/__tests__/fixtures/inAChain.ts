import type { ConfigModifier } from "../../../../../types/ConfigModifier.js";
import type { ChainMember } from "../../../translation-run/index.js";
import { provenanceModule } from "../../Provenance.module.js";
import type { ProvenanceServiceFactory } from "../../Provenance.wiring.js";

const UNCHANGED: ConfigModifier = (config) => config;

export const provenanceInAChain = (serviceFactory: ProvenanceServiceFactory): ChainMember[] => [
  provenanceModule({
    serviceFactory,
    refuseACollidingSlug: UNCHANGED,
    addTheCollection: UNCHANGED,
    cleanUpOnDelete: () => UNCHANGED,
  }),
];
