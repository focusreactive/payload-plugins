import { describe, expect, it } from "vitest";

import { optimisticValueOf } from "../../src/client/instantPreview/unsavedRender/optimisticValue";
import { textLeavesOf } from "../../src/shared/richText/textLeaves";
import { fieldAddressOf } from "../../src/shared/veDocument";

import { editorState, paragraph, textNode } from "../support/editorState";

const PAGE = { collectionSlug: "pages", docId: "1", kind: "collection" } as const;
const FIELD = { fieldAddress: fieldAddressOf(PAGE, "body"), meta: { ...PAGE, path: "body" } };
const LEAVES_PER_PARAGRAPH = 5;
const PARAGRAPHS = 100;
const RUNS = 21;
const MEDIAN_BUDGET_MS = 16;

const blockOf = (id: number) => ({
  fields: { blockType: "callout", id: `block-${id}`, text: `Saved ${id}` },
  type: "block",
  version: 2,
});

const largeState = () =>
  editorState(
    ...Array.from({ length: PARAGRAPHS }, (_, index) =>
      index % 10 === 0
        ? blockOf(index)
        : paragraph(
            ...Array.from({ length: LEAVES_PER_PARAGRAPH }, (__, leaf) =>
              textNode(`Paragraph ${index}, leaf ${leaf} `, leaf % 2)
            )
          )
    ),
    ...Array.from({ length: 10 }, (_, index) =>
      paragraph(
        ...Array.from({ length: LEAVES_PER_PARAGRAPH }, (__, leaf) =>
          textNode(`Tail ${index}, leaf ${leaf} `)
        )
      )
    )
  );

const medianOf = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

describe("the cost of the value the page builds for a structure", () => {
  it("builds and marks a value of 500 text leaves within a frame", () => {
    const state = largeState();
    const base = largeState();
    const durations = Array.from({ length: RUNS }, () => {
      const startedAt = performance.now();
      optimisticValueOf(state, FIELD, base);
      return performance.now() - startedAt;
    });

    expect(textLeavesOf(state)).toHaveLength(500);
    expect(medianOf(durations)).toBeLessThan(MEDIAN_BUDGET_MS);
  });
});
