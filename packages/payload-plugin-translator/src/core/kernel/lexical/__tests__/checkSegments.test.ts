import { describe, expect, it } from "vitest";

import { carriesOwnText, checkSegments } from "../checkSegments.js";
import type { AnsweredSegment, SentSegment } from "../checkSegments.js";

const sent = (id: number, text: string | null): SentSegment => ({ id, text });
const answered = (id: number, text: string): AnsweredSegment => ({ id, text });

const acceptedSegments = (result: ReturnType<typeof checkSegments>): AnsweredSegment[] => {
  if (!result.ok) throw new Error(`expected an accepted answer, got "${result.reason}"`);
  return result.segments;
};

const rejection = (result: ReturnType<typeof checkSegments>): string => {
  if (result.ok) throw new Error("expected a rejected answer, got an accepted one");
  return result.reason;
};

describe("carriesOwnText", () => {
  it("is true for a segment holding text", () => {
    expect(carriesOwnText("a car")).toBe(true);
  });

  it("is true for a segment holding the empty string — it is still a text position", () => {
    expect(carriesOwnText("")).toBe(true);
  });

  it("is false for a segment that only holds a position: a line break or an inline block", () => {
    expect(carriesOwnText(null)).toBe(false);
  });
});

describe("checkSegments", () => {
  describe("rejects an answer that does not match what was sent", () => {
    it("names an id that was never sent", () => {
      const result = checkSegments([answered(9, "x")], [sent(1, "a")]);
      expect(rejection(result)).toBe("unknown-segment");
    });

    it("answers the same id twice", () => {
      const result = checkSegments([answered(1, "x"), answered(1, "y")], [sent(1, "a")]);
      expect(rejection(result)).toBe("repeated-segment");
    });

    it("repeats one id while still naming every sent id", () => {
      const result = checkSegments(
        [answered(1, "x"), answered(1, "y"), answered(2, "z")],
        [sent(1, "a"), sent(2, "b")]
      );
      expect(rejection(result)).toBe("repeated-segment");
    });

    it("leaves a sent id unanswered", () => {
      const result = checkSegments([answered(1, "x")], [sent(1, "a"), sent(2, "b")]);
      expect(rejection(result)).toBe("missing-segment");
    });
  });

  describe("rejects an answer that carries no text at all", () => {
    it("answers every text segment with whitespace", () => {
      const result = checkSegments([answered(1, "   ")], [sent(1, "a car")]);
      expect(rejection(result)).toBe("no-text");
    });

    it("carries text only where the request held no text of its own", () => {
      const result = checkSegments(
        [answered(1, ""), answered(2, "stray")],
        [sent(1, "a car"), sent(2, null)]
      );
      expect(rejection(result)).toBe("no-text");
    });
  });

  describe("accepts an answer and reports its segments", () => {
    it("empties a segment that holds no text of its own, whatever came back for it", () => {
      const result = checkSegments(
        [answered(1, "une voiture"), answered(2, "stray")],
        [sent(1, "a car"), sent(2, null)]
      );
      expect(acceptedSegments(result)).toEqual([
        { id: 1, text: "une voiture" },
        { id: 2, text: "" },
      ]);
    });

    it("restores the edge whitespace the answer dropped, when the answer kept the request's shape", () => {
      const result = checkSegments(
        [answered(1, "une"), answered(2, "voiture"), answered(3, "rouge")],
        [sent(1, "a "), sent(2, "red"), sent(3, " car")]
      );
      expect(acceptedSegments(result)).toEqual([
        { id: 1, text: "une " },
        { id: 2, text: "voiture" },
        { id: 3, text: " rouge" },
      ]);
    });

    it("leaves the edges alone when the answer reordered the segments", () => {
      const result = checkSegments(
        [answered(3, "rouge"), answered(1, "une"), answered(2, "voiture")],
        [sent(1, "a "), sent(2, "red"), sent(3, " car")]
      );
      expect(acceptedSegments(result)).toEqual([
        { id: 3, text: "rouge" },
        { id: 1, text: "une" },
        { id: 2, text: "voiture" },
      ]);
    });

    it("restores a trailing space on its own", () => {
      const result = checkSegments(
        [answered(1, "une"), answered(2, "voiture")],
        [sent(1, "a "), sent(2, "car")]
      );
      expect(acceptedSegments(result)).toEqual([
        { id: 1, text: "une " },
        { id: 2, text: "voiture" },
      ]);
    });

    it("does not double an edge space the answer already carries", () => {
      const result = checkSegments(
        [answered(1, "une "), answered(2, "voiture"), answered(3, " rouge")],
        [sent(1, "a "), sent(2, "red"), sent(3, " car")]
      );
      expect(acceptedSegments(result)).toEqual([
        { id: 1, text: "une " },
        { id: 2, text: "voiture" },
        { id: 3, text: " rouge" },
      ]);
    });

    it("leaves a segment whose request held the empty string exactly as it came back", () => {
      const result = checkSegments(
        [answered(1, ""), answered(2, "voiture")],
        [sent(1, ""), sent(2, " car")]
      );
      expect(acceptedSegments(result)).toEqual([
        { id: 1, text: "" },
        { id: 2, text: "voiture" },
      ]);
    });

    it("leaves the edges alone when a segment came back emptied, since that is a merge", () => {
      const result = checkSegments(
        [answered(1, "une voiture rouge"), answered(2, ""), answered(3, "")],
        [sent(1, "a "), sent(2, "red"), sent(3, " car")]
      );
      expect(acceptedSegments(result)).toEqual([
        { id: 1, text: "une voiture rouge" },
        { id: 2, text: "" },
        { id: 3, text: "" },
      ]);
    });
  });
});
