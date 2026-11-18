import { describe, expect, it, vi } from "vitest";

import {
  answered,
  unanswered,
} from "../../../../core/translation-pipeline/__tests__/fixtures/pipelineResult.js";
import { reportRunOutcome } from "../reportRunOutcome.js";
import type { NothingSentBecause } from "../reportRunOutcome.js";

const target = { collection: "docs", documentId: "42", targetLocale: "de" };

const logs = () => ({ info: vi.fn(), warn: vi.fn() });

describe("reportRunOutcome", () => {
  it.each<[NothingSentBecause, "info" | "warn"]>([
    ["no-translatable-text", "info"],
    ["named-leaves-are-not-here", "warn"],
    ["rules-kept-nothing", "info"],
    ["collector-sent-nothing", "warn"],
  ])("logs a run that sent nothing because %s at %s, once", (because, level) => {
    const logger = logs();

    reportRunOutcome(logger, target, { sent: false, because });

    expect(logger[level]).toHaveBeenCalledOnce();
    expect(logger[level]).toHaveBeenCalledWith(
      expect.objectContaining({ ...target, msg: expect.any(String) })
    );
    expect(logger[level === "info" ? "warn" : "info"]).not.toHaveBeenCalled();
  });

  it("logs one warning per failed value, carrying the provider's message as detail", () => {
    const logger = logs();
    const failed = unanswered("body", "refused", "no-text");
    if (failed.answered) throw new Error("fixture");

    reportRunOutcome(logger, target, {
      sent: true,
      leaves: [
        answered("title"),
        {
          ...failed,
          failures: [{ code: "refused", message: "content policy" }, { code: "no-text" }],
        },
      ],
    });

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        ...target,
        idPath: "body",
        code: "refused",
        detail: "content policy",
      })
    );
    expect(logger.warn).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({ detail: expect.anything() })
    );
  });

  it("logs nothing when every leaf was answered", () => {
    const logger = logs();

    reportRunOutcome(logger, target, { sent: true, leaves: [answered("title"), answered("body")] });

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});
