import type OpenAI from "openai";
import { describe, expect, it } from "vitest";

import type { OpenAIClientShape } from "./OpenAI.shapes";

// Conformance test. `OpenAI.shapes.ts` describes the SDK's client without importing it, which is what
// keeps the SDK out of this package's emitted declarations — but a hand-written description can drift
// from the thing it describes. This file is the tripwire: it imports the real type (in type position
// only, and only here, in a file the build excludes) and asserts the real client still satisfies the
// slice. If OpenAI reshapes `chat.completions.create`, this fails in our CI on an SDK bump rather than
// in a consumer's production.
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
