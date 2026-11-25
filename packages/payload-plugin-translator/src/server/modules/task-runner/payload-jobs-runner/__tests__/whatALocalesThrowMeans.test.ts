import { describe, expect, it } from "vitest";

import { whatALocalesThrowMeans } from "../model/whatALocalesThrowMeans.js";

const reachedTheWorkflow = new Error("the queue refused its own write");

describe("a locale whose step threw, with no mark of this plugin's own handler", () => {
  it("means the queue failed before this plugin was reached", () => {
    expect(whatALocalesThrowMeans(undefined, reachedTheWorkflow)).toStrictEqual({
      kind: "the-queue-failed-before-us",
    });
  });
});

describe("a locale marked translated", () => {
  it("means the work landed and the queue could not record it", () => {
    expect(whatALocalesThrowMeans({ kind: "translated" }, reachedTheWorkflow)).toStrictEqual({
      kind: "the-work-landed",
    });
  });
});

describe("a locale marked failed", () => {
  const ourOwn = new Error("the provider refused the text");

  it("means the translation failed", () => {
    expect(whatALocalesThrowMeans({ kind: "failed", error: ourOwn }, reachedTheWorkflow).kind).toBe(
      "the-translation-failed"
    );
  });

  /*
   * What reaches the workflow is the queue's re-raise, which says nothing about the provider. The
   * editor is shown the error this plugin's own handler caught.
   */
  it("carries the error this plugin's handler caught, not the one the workflow saw", () => {
    expect(whatALocalesThrowMeans({ kind: "failed", error: ourOwn }, reachedTheWorkflow)).toEqual({
      kind: "the-translation-failed",
      error: ourOwn,
    });
  });
});

describe("a locale marked started and nothing further", () => {
  it("means the translation failed, carrying what reached the workflow", () => {
    expect(whatALocalesThrowMeans({ kind: "started" }, reachedTheWorkflow)).toEqual({
      kind: "the-translation-failed",
      error: reachedTheWorkflow,
    });
  });
});
