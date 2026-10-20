import { describe, expect, it } from "vitest";
import { PROSEMIRROR_ID, prosemirrorLanguage } from "./fixtures/prosemirror.js";
import { fromPayload, postsSchema } from "./fixtures/harness.js";

describe("Payload fields → ProseMirror → Payload fields", () => {
  it("crosses into a rich text from another product just the same", () => {
    const document = {
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
          {
            type: "blok",
            attrs: {
              id: "cta-1",
              body: [{ component: "ctaBanner", heading: "Click me", description: "Please" }],
            },
          },
        ],
      },
    };

    const targets = fromPayload(postsSchema(PROSEMIRROR_ID), document, prosemirrorLanguage());

    expect(targets.map((target) => target.text)).toEqual(["Intro", "Click me", "Please"]);
  });
});
