import { describe, expect, it } from "vitest";

import { mustPropagate } from "../../../../errors/index.js";
import { readFailureReason } from "../../../../errors/failureReason.js";
import type { UserFacingFailureReason } from "../../../../errors/failureReason.js";
import { TranslationStage } from "../Translation.stage.js";
import type { PipelineContext } from "../../../types/index.js";
import type {
  TranslationOutput,
  TranslationProvider,
} from "../../../../domain/translation-providers/index.js";

const throwing = (error: unknown): TranslationProvider => ({
  translate: async (): Promise<TranslationOutput> => {
    throw error;
  },
});

const aContext = (): PipelineContext => ({
  schema: [],
  sourceData: {},
  targetData: {},
  sourceLng: "en",
  targetLng: "de",
  document: { collection: "docs", id: "1" },
  selection: [],
  textMap: { 0: { kind: "text", text: "Home" } },
});

const failureOf = async (error: unknown): Promise<Error> => {
  try {
    await new TranslationStage(throwing(error)).execute(aContext());
  } catch (thrown) {
    if (thrown instanceof Error) return thrown;
    throw new Error("the stage threw something that is not an Error", { cause: thrown });
  }
  throw new Error("the stage did not throw");
};

const reasonOf = async (error: unknown): Promise<UserFacingFailureReason | null> =>
  readFailureReason((await failureOf(error)).message);

const withCode = (code: string, message: string): Error =>
  Object.assign(new Error(message), { code });

describe("a provider's failure code reaches a person", () => {
  it.each([
    ["no-content", "service-no-answer"],
    ["transport", "service-unreachable"],
    ["unparseable-reply", "translation-damaged"],
    ["key-set-mismatch", "translation-incomplete"],
    ["config", "translation-not-configured"],
  ])("answers %s with the reason %s", async (code, reason) => {
    expect(await reasonOf(withCode(code, "vendor detail"))).toBe(reason);
  });

  it("keeps a reason the thrown error already carries", async () => {
    const alreadyMarked = withCode(
      "config",
      "[translator:model-unavailable] the model is not available to this key"
    );
    expect(await reasonOf(alreadyMarked)).toBe("model-unavailable");
  });

  it("leaves a throw that claims no code unmarked, so it is not mislabelled", async () => {
    expect(await reasonOf(new Error("something else broke"))).toBeNull();
  });

  it("does not let a provider failure read as a rolled-back write", async () => {
    expect(mustPropagate(await failureOf(withCode("transport", "ECONNRESET")))).toBe(false);
  });

  it("keeps the failure code the port promises every provider failure carries", async () => {
    const failure = await failureOf(withCode("transport", "ECONNRESET"));
    expect("code" in failure ? failure.code : undefined).toBe("transport");
  });

  it("never lets the thrown error's own text travel in the marked message", async () => {
    const secretive = withCode("config", "401 Incorrect API key provided: sk-proj-abc123");
    expect((await failureOf(secretive)).message).not.toContain("sk-proj-abc123");
  });
});
