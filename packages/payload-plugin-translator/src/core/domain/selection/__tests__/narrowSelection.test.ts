import { describe, expect, it } from "vitest";

import { narrowSelection } from "../narrowSelection.js";

describe("what a run translates", () => {
  it("leaves the starting list as it stands when no criterion was given", () => {
    expect(narrowSelection(["title", "body"], [])).toEqual(["title", "body"]);
  });

  it("keeps only what the answer accepts", () => {
    expect(narrowSelection(["title", "subtitle", "body"], [["body"]])).toEqual(["body"]);
  });

  it("answers in the starting list's order, not the criterion's", () => {
    expect(narrowSelection(["title", "subtitle", "body"], [["body", "title"]])).toEqual([
      "title",
      "body",
    ]);
  });

  it("never adds an address the run did not start from", () => {
    expect(narrowSelection(["title"], [["title", "footer"]])).toEqual(["title"]);
  });

  it("keeps only what every answer accepts", () => {
    const both = narrowSelection(
      ["title", "subtitle", "body"],
      [
        ["title", "body"],
        ["body", "subtitle"],
      ]
    );

    expect(both).toEqual(["body"]);
  });

  it("answers the same whichever order the lists arrive in", () => {
    const first = [["title", "body"], ["body"]];
    const second = [["body"], ["title", "body"]];

    expect(narrowSelection(["title", "body"], first)).toEqual(
      narrowSelection(["title", "body"], second)
    );
  });

  it("empties the run when an answer accepts nothing", () => {
    expect(narrowSelection(["title", "body"], [[]])).toEqual([]);
  });

  it("answers nothing when the run started from nothing", () => {
    expect(narrowSelection([], [["title"]])).toEqual([]);
  });

  it("holds an address once even when the starting list names it twice", () => {
    expect(narrowSelection(["title", "title", "body"], [])).toEqual(["title", "body"]);
  });
});
