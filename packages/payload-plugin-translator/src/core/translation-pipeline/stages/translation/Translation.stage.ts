import { checkSegments } from "../../../kernel/lexical/checkSegments.js";
import { isFailureCode, TranslationFailed } from "./TranslationFailed.js";
import { isObject } from "../../../kernel/utils/isObject.js";
import { readFailureReason } from "../../../errors/failureReason.js";
import type {
  PipelineContext,
  PipelineStage,
  SettledAnswer,
  TextChunk,
} from "../../types/index.js";
import { isRichContainerChunk } from "../../types/index.js";
import type {
  TranslatedValue,
  TranslationProvider,
  TranslationRequest,
} from "../../../domain/translation-providers/index.js";

const alreadyNamesItsReason = (thrown: unknown): boolean =>
  thrown instanceof Error && readFailureReason(thrown.message) !== null;

function asUserFacingFailure(thrown: unknown): unknown {
  if (alreadyNamesItsReason(thrown)) return thrown;
  if (!isObject(thrown)) return thrown;

  const { code } = thrown;
  return isFailureCode(code) ? new TranslationFailed(code, thrown) : thrown;
}

function translationRequest(ctx: PipelineContext): TranslationRequest {
  return { sourceLng: ctx.sourceLng, targetLng: ctx.targetLng, document: ctx.document };
}

/**
 * Judged against `chunk.fragments`, not against `ctx.textMap`: the stage hands the provider a
 * shallow copy, so `TranslationInput`'s `Readonly` stops nothing at run time.
 */
function settle(chunk: TextChunk, answer: TranslatedValue | undefined): SettledAnswer {
  if (answer === undefined) return { kind: "failed", failure: { code: "not-answered" } };
  if (answer.kind === "failed") {
    return { kind: "failed", failure: { code: answer.code, message: answer.message } };
  }

  if (!isRichContainerChunk(chunk)) {
    return answer.kind === "text"
      ? { kind: "text", text: answer.text }
      : { kind: "failed", failure: { code: "wrong-kind" } };
  }
  if (answer.kind !== "segments") return { kind: "failed", failure: { code: "wrong-kind" } };

  const checked = checkSegments(answer.segments, chunk.fragments);
  return checked.ok
    ? { kind: "segments", segments: checked.segments }
    : { kind: "failed", failure: { code: checked.reason } };
}

export class TranslationStage implements PipelineStage {
  private readonly provider: TranslationProvider;
  constructor(provider: TranslationProvider) {
    this.provider = provider;
  }

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (!ctx.textMap || Object.keys(ctx.textMap).length === 0) {
      return ctx;
    }

    const answers = await this.provider
      .translate({ ...ctx.textMap }, translationRequest(ctx))
      .catch((thrown: unknown): never => {
        throw asUserFacingFailure(thrown);
      });

    const settled: Record<number, SettledAnswer> = {};
    for (const chunk of ctx.textChunks ?? []) {
      settled[chunk.index] = settle(chunk, answers[chunk.index]);
    }

    return { ...ctx, answers: settled };
  }
}
