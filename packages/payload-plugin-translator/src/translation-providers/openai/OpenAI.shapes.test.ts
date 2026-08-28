import type OpenAI from "openai";
import { describe, expect, it } from "vitest";

import type { OpenAIClientShape } from "./OpenAI.shapes";

// The one file allowed to import the real SDK type (type position, excluded from the build): it
// asserts the hand-written slice still accepts the real client, so an SDK reshape fails here.
describe("OpenAIClientShape", () => {
  it("is satisfied by the real OpenAI client type", () => {
    const conformance: OpenAIClientShape = {} as OpenAI;

    expect(conformance).toBeDefined();
  });

  it("is satisfied by a plain object literal, so tests need no SDK mock", () => {
    const stub: OpenAIClientShape = {
      chat: {
        completions: {
          create: async () => ({ choices: [{ message: { content: "{}" } }] }),
        },
      },
    };

    expect(stub.chat.completions.create).toBeTypeOf("function");
  });
});
