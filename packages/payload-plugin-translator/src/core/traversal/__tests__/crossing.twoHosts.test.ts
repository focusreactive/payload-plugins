import { describe, expect, it } from "vitest";
import { LEXICAL_ID, lexicalLanguage } from "./fixtures/lexical.js";
import type { Blok } from "./fixtures/storyblok.js";
import {
  fromPayload,
  fromStoryblok,
  lexicalPost,
  postsSchema,
  storyRegistry,
} from "./fixtures/harness.js";

describe("one rich-text language, two hosts", () => {
  it("applies the entering host's selection rule to its embeds", () => {
    const lexical = lexicalLanguage();

    const payloadDocument = lexicalPost();
    const fromPayloadTargets = fromPayload(postsSchema(LEXICAL_ID), payloadDocument, lexical);

    const story: Blok = {
      component: "page",
      _uid: "root",
      title: "Story title",
      body: {
        root: {
          type: "root",
          children: [
            { type: "paragraph", children: [{ type: "text", text: "Prose" }] },
            {
              type: "block",
              fields: {
                blockType: "cta",
                component: "cta",
                _uid: "c1",
                headline: "Deal",
                link: "/x",
              },
            },
          ],
        },
      },
    };
    const fromStoryblokTargets = fromStoryblok(storyRegistry(LEXICAL_ID), story, lexical);

    const payloadTexts = fromPayloadTargets.map((target) => target.text);
    const storyblokTexts = fromStoryblokTargets.map((target) => target.text);

    expect(payloadTexts).toEqual(["Intro", "Click me", "Please", "Get started", "Read the docs"]);
    expect(storyblokTexts).toEqual(["Story title", "Prose", "Deal"]);

    // The embed each host kept out is the proof that its own rule ran: Payload drops `href`
    // because it carries no `localized`, Storyblok drops `link` because it is not `translatable`.
    expect(payloadTexts).not.toContain("/buy");
    expect(storyblokTexts).not.toContain("/x");
  });
});
