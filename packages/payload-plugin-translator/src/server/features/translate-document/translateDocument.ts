import type { CollectionSlug, Payload } from "payload";

import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ID } from "../../modules/task-runner/index.js";
import type { TranslationFilter } from "../../../core/domain/selection/index.js";
import type { ChainMember, Criteria } from "../../modules/translation-run/index.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { reportNothingSent } from "./reportNothingSent.js";
import { openRun } from "./run.js";
import type { Run } from "./run.js";
import { runModulesAfter, runModulesBefore } from "./runModules.js";
import { selectLeaves } from "./selectLeaves.js";
import { translateOrWrap } from "./translateOrWrap.js";

/**
 * What translating one locale needs to know. Assembled by the caller from the run's own record —
 * the runner knows only which run and which locale, so none of this reaches it.
 */
export type TranslateDocumentInput = {
  collection: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
  filters?: readonly TranslationFilter[];
  publishOnTranslation: boolean;
  previousAttempts: number;
};

export type TranslateDocumentDeps = {
  readonly translationProvider: TranslationProvider;
  readonly schemaMap: CollectionSchemaMap;
  readonly modules?: readonly ChainMember[];
  readonly criteria?: Criteria;
};

async function publishIfAsked(run: Run, asked: boolean): Promise<void> {
  if (!asked || run.layer.kind !== "drafts") return;
  await run.doc.publish(run.layer.publish);
}

/**
 * An empty `scope` is not neutral: with no `requester`, no rule is asked and both the read and the
 * write run with Payload's access checks off.
 */
export async function translateDocument(
  deps: TranslateDocumentDeps,
  payload: Payload,
  input: TranslateDocumentInput,
  scope: RequestScope
): Promise<void> {
  const modules = deps.modules ?? [];

  const run = await openRun({ payload, taskInput: input, scope, schemaMap: deps.schemaMap });
  const source = await run.doc.readSourceIfAllowed();

  const owed = await selectLeaves({
    run,
    criteria: deps.criteria ?? {},
    filters: input.filters ?? [],
    source,
  });
  const joined = await runModulesBefore({
    modules,
    run,
    source,
    previousAttempts: input.previousAttempts,
  });
  const translated = await translateOrWrap({
    run,
    translationProvider: deps.translationProvider,
    source,
    selection: owed.addresses,
  });

  if (translated?.translatedData) {
    await run.doc.saveTranslation(translated.translatedData, run.layer.write);
    await runModulesAfter({
      modules,
      run,
      moduleState: joined.moduleState,
      leaves: translated.leaves,
    });
  } else {
    reportNothingSent(run, owed.emptyBecause);
  }

  await publishIfAsked(run, input.publishOnTranslation);
}
