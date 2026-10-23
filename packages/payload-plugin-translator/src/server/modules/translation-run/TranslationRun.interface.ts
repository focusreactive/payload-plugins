import type { CollectionSlug, Payload } from "payload";

import type { ChangedLeaves } from "../../../core/domain/provenance/index.js";
import type { LeafOutcome } from "../../../core/translation-pipeline/types/index.js";
import type { ID } from "../task-runner/types.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";

/**
 * A module's working value for one run, keyed by module name. Per-run state lives here, never on the
 * module: one instance serves every concurrent translation.
 */
export type ModuleState = Readonly<Record<string, unknown>>;

export type RunTarget = {
  readonly collection: CollectionSlug;
  readonly documentId: ID;
  readonly sourceLocale: string;
  readonly targetLocale: string;
};

export type BeforeTranslation = {
  readonly payload: Payload;
  readonly target: RunTarget;
  readonly scope: RequestScope;
  /** The source document as the run read it, in the source locale. */
  readonly sourceData: Record<string, unknown>;
  readonly previousAttempts: number;
  readonly moduleState: ModuleState;
  readonly sourceChangedByLeaf?: ChangedLeaves;
};

export type AfterSave = {
  readonly payload: Payload;
  readonly target: RunTarget;
  readonly scope: RequestScope;
  readonly moduleState: ModuleState;
  /** What the provider answered for each leaf the run sent. */
  readonly leaves: readonly LeafOutcome[];
};

/** What a module adds to the run; the chain reads nothing else back from it. */
export type RunContribution = {
  readonly moduleState?: ModuleState;
  readonly sourceChangedByLeaf?: ChangedLeaves;
};

/** A module must survive a replay: a retried job runs `beforeTranslation` again. */
export type ChainMember = {
  /** Names this module's slot in {@link ModuleState}; unique across the chain. */
  readonly name: string;
  beforeTranslation?(state: BeforeTranslation): Promise<RunContribution>;
  afterSave?(state: AfterSave): Promise<void>;
};

export type RunLogger = {
  error(details: Record<string, unknown>): void;
};
