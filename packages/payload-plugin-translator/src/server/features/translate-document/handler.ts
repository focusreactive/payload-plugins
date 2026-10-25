import { asTranslatorError } from "../../../translation-providers/shared/errors/index.js";
import { TranslatorConfigError } from "../../../core/errors/index.js";
import type { Payload } from "payload";
import { APIError } from "payload";

import type { Handler } from "../../shared/index.js";
import type { TranslationProvider } from "../../../core/domain/translation-providers/index.js";
import { translateContent } from "../../../core/translation-pipeline/index.js";
import type { LeafOutcome } from "../../../core/translation-pipeline/types/index.js";
import type {
  BeforeTranslation,
  ChainMember,
  Criteria,
  CriterionQuestion,
  ModuleState,
  RunTarget,
} from "../../modules/translation-run/index.js";
import { runAfterSave, runBeforeTranslation } from "../../modules/translation-run/index.js";
import { narrowSelection } from "../../../core/domain/selection/index.js";
import type { LeafAnswer } from "../../../core/domain/selection/index.js";
import type { RuleName } from "../../../core/domain/selection/TranslationFilter.js";
import type { LeafAddress } from "../../../core/domain/content-projection/idPath.js";
import type { TranslationFilter } from "../../../core/domain/selection/index.js";
import { everyTranslatableLeaf } from "../../../core/domain/content-projection/contentProjector.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { openTargetDocument } from "./targetDocument.js";
import type { BothLocales, TargetDocument } from "./targetDocument.js";

import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { TranslateDocumentInput, TranslateDocumentOutput } from "./model.js";
import { resolveTargetLayer } from "./targetLayer.js";
import type { TargetLayer } from "./targetLayer.js";

const moduleSeam = (run: Run): Pick<BeforeTranslation, "payload" | "target" | "scope"> => ({
  payload: run.payload,
  target: run.target,
  scope: run.scope,
});

/**
 * Per call, never per instance: one handler instance (`wireTranslateRunner.ts`, built once at
 * config time) serves jobs the queue runs concurrently, so none of this may be held on `this`.
 */
type Run = {
  readonly payload: Payload;
  readonly target: RunTarget;
  readonly scope: RequestScope;
  readonly schema: FieldLike[];
  readonly layer: TargetLayer;
  readonly doc: TargetDocument;
};

/** What narrowing concluded, when it left nothing. */
type EmptyBecause = "no-translatable-text" | "named-leaves-are-not-here" | "rules-kept-nothing";

/** The collector has the last word: it drops a leaf whose source is empty, after narrowing kept it. */
type SentNothingBecause = EmptyBecause | "collector-sent-nothing";

const REPORTED: Record<SentNothingBecause, { level: "info" | "warn"; msg: string }> = {
  "no-translatable-text": {
    level: "info",
    msg: "translator: this document holds no translatable text",
  },
  "named-leaves-are-not-here": {
    level: "warn",
    msg: "translator: no leaf the request named is translatable text in this document",
  },
  "rules-kept-nothing": {
    level: "info",
    msg: "translator: the run found nothing to bring up to date",
  },
  "collector-sent-nothing": {
    level: "warn",
    msg: "translator: nothing the request selected was sent — not translatable here, or its source is empty",
  },
};

const emptyBecause = (step: {
  everything: readonly LeafAddress[];
  afterLeaves: readonly LeafAddress[];
  addresses: readonly LeafAddress[];
}): EmptyBecause | null => {
  if (step.addresses.length > 0) return null;
  if (step.everything.length === 0) return "no-translatable-text";
  if (step.afterLeaves.length === 0) return "named-leaves-are-not-here";
  return "rules-kept-nothing";
};

type TranslateDocumentDeps = {
  readonly translationProvider: TranslationProvider;
  readonly schemaMap: CollectionSchemaMap;
  readonly modules?: readonly ChainMember[];
  readonly criteria?: Criteria;
};

export class TranslateDocumentHandler implements Handler<
  TranslateDocumentInput,
  TranslateDocumentOutput
> {
  private readonly translationProvider: TranslationProvider;
  private readonly schemaMap: CollectionSchemaMap;
  private readonly modules: readonly ChainMember[];
  private readonly criteria: Criteria;

  constructor(deps: TranslateDocumentDeps) {
    this.translationProvider = deps.translationProvider;
    this.schemaMap = deps.schemaMap;
    this.modules = deps.modules ?? [];
    this.criteria = deps.criteria ?? {};
  }

  async handle(
    payload: Payload,
    input: TranslateDocumentInput,
    scope: RequestScope = {}
  ): Promise<TranslateDocumentOutput> {
    const run = await this.beginRun(payload, input, scope);
    const both = await run.doc.readBothLocales();
    await run.doc.refuseUnlessTranslationAllowed(both.sourceData);

    const owed = await this.leavesToSend(run, input.filters ?? [], both.sourceData);
    const joined = await this.runModulesBefore(run, both.sourceData, input.previousAttempts);
    const translated = await this.translateOrWrap(run, both, owed.addresses);

    if (translated?.translatedData) {
      await run.doc.saveTranslation(translated.translatedData, run.layer.write);
      await this.runModulesAfter(run, joined.moduleState, translated.leaves);
    } else {
      this.reportNothingSent(run, owed.emptyBecause);
    }

    await this.publishIfAsked(run, input.publishOnTranslation);
    return { success: true };
  }

  private async beginRun(
    payload: Payload,
    input: TranslateDocumentInput,
    scope: RequestScope
  ): Promise<Run> {
    const schema = this.schemaMap.get(input.collection);
    if (!schema) {
      throw new TranslatorConfigError(`Collection "${input.collection}" not found in schemaMap`);
    }

    const versions = payload.collections[input.collection].config.versions;
    const layer = resolveTargetLayer({ versions, targetLng: input.targetLng });
    const target = {
      collection: input.collection,
      documentId: input.collectionId,
      sourceLocale: input.sourceLng,
      targetLocale: input.targetLng,
    };

    return {
      payload,
      target,
      scope,
      schema,
      layer,
      doc: await openTargetDocument({ payload, target, scope }),
    };
  }

  private async leavesToSend(
    run: Run,
    filters: readonly TranslationFilter[],
    sourceData: Record<string, unknown>
  ): Promise<{ addresses: readonly LeafAddress[]; emptyBecause: EmptyBecause | null }> {
    const question = { payload: run.payload, scope: run.scope, target: run.target, sourceData };
    const everything = everyTranslatableLeaf(sourceData, run.schema);
    const named = filters.flatMap((filter) => (filter.kind === "leaves" ? [filter.addresses] : []));
    const answered = await Promise.all(
      filters.flatMap((filter) =>
        filter.kind === "rule" ? [this.answerTo(filter.name, question)] : []
      )
    );

    const afterLeaves = narrowSelection(everything, named);
    const addresses = narrowSelection(afterLeaves, answered);
    return { addresses, emptyBecause: emptyBecause({ everything, afterLeaves, addresses }) };
  }

  private answerTo(name: RuleName, question: CriterionQuestion): Promise<LeafAnswer> {
    const answer = this.criteria[name];
    if (!answer) {
      throw new TranslatorConfigError(
        `No criterion answers to "${name}". A run naming it cannot be narrowed, and translating the whole document instead would overwrite reviewed text.`
      );
    }
    return answer(question);
  }

  private runModulesBefore(
    run: Run,
    sourceData: Record<string, unknown>,
    previousAttempts: number
  ) {
    const opening = { ...moduleSeam(run), sourceData, previousAttempts, moduleState: {} };
    return runBeforeTranslation(this.modules, opening, run.payload.logger);
  }

  private runModulesAfter(run: Run, moduleState: ModuleState, leaves: readonly LeafOutcome[]) {
    return runAfterSave(
      this.modules,
      { ...moduleSeam(run), moduleState, leaves },
      run.payload.logger
    );
  }

  /**
   * A `TranslationProvider` is a host extension point, so whatever it throws is outside this
   * plugin's control, and an unrecognised error otherwise reads as "a Payload operation failed" —
   * which would surface a provider outage as a lost save. An `APIError` is the exception: a provider
   * is free to query Payload itself, and if it did, that operation has already rolled the caller's
   * transaction back. Only a failure carrying no such evidence is safe to adopt as ours.
   */
  private async translateOrWrap(
    run: Run,
    both: BothLocales,
    selection: readonly LeafAddress[]
  ): Promise<Awaited<ReturnType<typeof translateContent>>> {
    try {
      return await translateContent({
        schema: run.schema,
        sourceData: both.sourceData,
        targetData: both.currentTarget,
        sourceLng: run.target.sourceLocale,
        targetLng: run.target.targetLocale,
        document: { collection: run.target.collection, id: run.target.documentId },
        translationProvider: this.translationProvider,
        selection,
      });
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw asTranslatorError(error);
    }
  }

  private async publishIfAsked(run: Run, asked: boolean) {
    if (!asked || run.layer.kind !== "drafts") return;
    await run.doc.publish(run.layer.publish);
  }

  private reportNothingSent(run: Run, reason: EmptyBecause | null): void {
    const { collection, documentId, targetLocale } = run.target;
    const { level, msg } = REPORTED[reason ?? "collector-sent-nothing"];
    run.payload.logger[level]({ collection, documentId, targetLocale, msg });
  }
}
