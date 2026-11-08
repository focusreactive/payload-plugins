import { describe, expect, it } from "vitest";
import { PROSEMIRROR_ID, prosemirrorLanguage } from "./fixtures/prosemirror.js";
import type { Blok } from "./fixtures/storyblok.js";
import { fromStoryblok, storyRegistry } from "./fixtures/harness.js";
import { sentTextsOf } from "./fixtures/sentText.js";

describe("Storyblok components → ProseMirror → Storyblok components", () => {
  it("collects the story's own text and the text inside an embedded component", () => {
    const story: Blok = {
      component: "page",
      _uid: "root",
      title: "Story title",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Prose" }] },
          {
            type: "blok",
            attrs: {
              id: "b1",
              body: [{ component: "cta", _uid: "c1", headline: "Deal", link: "/x" }],
            },
          },
        ],
      },
    };

    const { targets } = fromStoryblok(storyRegistry(PROSEMIRROR_ID), story, prosemirrorLanguage());

    expect(sentTextsOf(targets)).toEqual(["Story title", "Prose", "Deal"]);
    expect(targets.map((target) => target.idPath)).toEqual([
      ["title"],
      ["body", 0, 0],
      ["body", 1, "b1", "headline"],
    ]);
  });

  it("asks nothing for an embedded component that names no type, and keeps its siblings", () => {
    const story: Blok = {
      component: "page",
      _uid: "root",
      title: "Story title",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Prose" }] },
          { type: "blok", attrs: { id: "b1", body: [{ _uid: "c1", headline: "Orphan" }] } },
        ],
      },
    };

    const { targets } = fromStoryblok(storyRegistry(PROSEMIRROR_ID), story, prosemirrorLanguage());

    expect(sentTextsOf(targets)).toEqual(["Story title", "Prose"]);
  });
});
