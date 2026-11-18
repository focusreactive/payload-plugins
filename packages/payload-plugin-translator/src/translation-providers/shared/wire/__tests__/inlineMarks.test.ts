import { describe, it, expect } from "vitest";
import type {
  SentSegment,
  AnsweredSegment,
} from "../../../../core/kernel/lexical/checkSegments.js";
import { checkSegments } from "../../../../core/kernel/lexical/checkSegments.js";
import { decodeSegments, encodeSegments } from "../inlineMarks.js";

const fragment = (id: number, text: string | null): SentSegment => ({ id, text });

type DecodeThenCheckResult =
  | { ok: true; segments: AnsweredSegment[] }
  | { ok: false; reason: string };

const decodeThenCheck = (reply: string, fragments: SentSegment[]): DecodeThenCheckResult => {
  const decoded = decodeSegments(reply);
  if (!decoded.ok) return decoded;
  return checkSegments(decoded.segments, fragments);
};

const acceptedFragments = (result: DecodeThenCheckResult): AnsweredSegment[] => {
  if (!result.ok) {
    throw new Error(`expected an accepted reply, got the failure "${result.reason}"`);
  }
  return result.segments;
};

const rejectionReason = (result: DecodeThenCheckResult): string => {
  if (result.ok) {
    throw new Error("expected a rejected reply, got an accepted one");
  }
  return result.reason;
};

describe("encodeSegments", () => {
  it("serialize wraps every fragment in its own numbered mark", () => {
    const marked = encodeSegments([fragment(1, "a "), fragment(2, "red"), fragment(3, " car")]);

    expect(marked).toBe("<1>a </1><2>red</2><3> car</3>");
  });

  it("serialize wraps a lone fragment as well", () => {
    const marked = encodeSegments([fragment(1, "a car")]);

    expect(marked).toBe("<1>a car</1>");
  });

  it("serialize renders a text-free fragment self-closing", () => {
    const marked = encodeSegments([fragment(2, null)]);

    expect(marked).toBe("<2/>");
  });

  it("serialize renders a line break between two texts as a self-closing mark", () => {
    const marked = encodeSegments([
      fragment(1, "first line"),
      fragment(2, null),
      fragment(3, "second line"),
    ]);

    expect(marked).toBe("<1>first line</1><2/><3>second line</3>");
  });

  it("serialize uses the numbers it was given, not the positions", () => {
    const marked = encodeSegments([fragment(4, "read the "), fragment(5, "docs")]);

    expect(marked).toBe("<4>read the </4><5>docs</5>");
  });

  it("serialize keeps the order given even when the numbers do not ascend", () => {
    const marked = encodeSegments([fragment(3, " car"), fragment(1, "a ")]);

    expect(marked).toBe("<3> car</3><1>a </1>");
  });
});

describe("decodeSegments, then the plugin's check", () => {
  describe("reply order", () => {
    const frenchSent = [fragment(1, "a "), fragment(2, "red"), fragment(3, " car")];
    const frenchReply = "<1>une </1><3>voiture </3><2>rouge</2>";

    it("reorder: the French adjective reply is accepted", () => {
      const result = decodeThenCheck(frenchReply, frenchSent);

      expect(result.ok).toBe(true);
    });

    it("reorder: fragments come back in the reply's order, not the sent order", () => {
      const result = decodeThenCheck(frenchReply, frenchSent);

      expect(acceptedFragments(result).map((f) => f.id)).toEqual([1, 3, 2]);
    });

    it("reorder: each number keeps its own text after the move", () => {
      const result = decodeThenCheck(frenchReply, frenchSent);

      expect(acceptedFragments(result).map((f) => f.text)).toEqual(["une ", "voiture ", "rouge"]);
    });

    it("reorder: a German subordinate clause comes back in its own order", () => {
      const sent = [
        fragment(1, "I know "),
        fragment(2, "that he "),
        fragment(3, "reads"),
        fragment(4, " the book"),
      ];

      const result = decodeThenCheck(
        "<1>Ich weiß </1><2>dass er </2><4>das Buch </4><3>liest</3>",
        sent
      );

      expect(acceptedFragments(result).map((f) => f.id)).toEqual([1, 2, 4, 3]);
    });

    it("reorder: a reply left in the original order is accepted unchanged", () => {
      const sent = [fragment(1, "a "), fragment(2, "red"), fragment(3, " car")];

      const result = decodeThenCheck("<1>ein </1><2>rotes</2><3> Auto</3>", sent);

      expect(acceptedFragments(result).map((f) => f.id)).toEqual([1, 2, 3]);
    });

    it("reorder: a single-fragment reply parses back to that one fragment", () => {
      const result = decodeThenCheck("<1>une voiture</1>", [fragment(1, "a car")]);

      expect(acceptedFragments(result)).toEqual([{ id: 1, text: "une voiture" }]);
    });
  });

  describe("verdicts", () => {
    const mergeSent = [fragment(1, "a "), fragment(2, "red"), fragment(3, " car")];
    const mergeReply = "<1>une voiture rouge</1><2></2><3></3>";

    it("verdict is ok when a merge is expressed as an empty mark", () => {
      const result = decodeThenCheck(mergeReply, mergeSent);

      expect(result.ok).toBe(true);
    });

    it("verdict: a merged-away fragment comes back with an empty string", () => {
      const result = decodeThenCheck(mergeReply, mergeSent);

      expect(acceptedFragments(result).map((f) => f.text)).toEqual(["une voiture rouge", "", ""]);
    });

    it("verdict is missing-segment when an issued number does not come back", () => {
      const result = decodeThenCheck("<1>une </1><2>rouge</2>", [
        fragment(1, "a "),
        fragment(2, "red"),
        fragment(3, " car"),
      ]);

      expect(rejectionReason(result)).toBe("missing-segment");
    });

    it("verdict is missing-segment for an empty reply", () => {
      const result = decodeThenCheck("", [fragment(1, "a "), fragment(2, "red")]);

      expect(rejectionReason(result)).toBe("missing-segment");
    });

    it("verdict is unknown-segment when a number nobody issued appears", () => {
      const result = decodeThenCheck("<1>une </1><2>rouge</2><3>extra</3>", [
        fragment(1, "a "),
        fragment(2, "red"),
      ]);

      expect(rejectionReason(result)).toBe("unknown-segment");
    });

    it("verdict is repeated-segment when an issued number comes back twice", () => {
      const result = decodeThenCheck("<1>une </1><2>rouge</2><1>encore</1>", [
        fragment(1, "a "),
        fragment(2, "red"),
      ]);

      expect(rejectionReason(result)).toBe("repeated-segment");
    });

    it("verdict is malformed when a mark opens inside another", () => {
      const result = decodeThenCheck("<1><2>rouge</2></1>", [
        fragment(1, "a "),
        fragment(2, "red"),
      ]);

      expect(rejectionReason(result)).toBe("malformed");
    });

    it("verdict is malformed when a mark closes with another number", () => {
      const result = decodeThenCheck("<1>une voiture rouge</2>", [
        fragment(1, "a "),
        fragment(2, "red"),
      ]);

      expect(rejectionReason(result)).toBe("malformed");
    });

    it("verdict is malformed when a mark is never closed", () => {
      const result = decodeThenCheck("<1>une </1><2>rouge", [
        fragment(1, "a "),
        fragment(2, "red"),
      ]);

      expect(rejectionReason(result)).toBe("malformed");
    });

    it("verdict is no-text when every mark comes back empty", () => {
      const result = decodeThenCheck("<1></1><2></2>", [fragment(1, "a "), fragment(2, "red")]);

      expect(rejectionReason(result)).toBe("no-text");
    });

    it("verdict: a corrupt reply carries no fragments at all", () => {
      const result = decodeThenCheck("<1>une </1>", [fragment(1, "a "), fragment(2, "red")]);

      expect((result as { fragments?: unknown }).fragments).toBeUndefined();
    });

    it("verdict is ok with stray whitespace inside an opening mark", () => {
      const result = decodeThenCheck("< 1 >une </1><2>rouge</2>", [
        fragment(1, "a "),
        fragment(2, "red"),
      ]);

      expect(result.ok).toBe(true);
    });

    it("verdict is ok with stray whitespace inside a closing mark", () => {
      const result = decodeThenCheck("<1>une </ 1 ><2>rouge</2>", [
        fragment(1, "a "),
        fragment(2, "red"),
      ]);

      expect(result.ok).toBe(true);
    });

    it("verdict: stray whitespace inside a mark does not leak into the text", () => {
      const result = decodeThenCheck("< 1 >une </ 1 ><2>rouge</2>", [
        fragment(1, "a "),
        fragment(2, "red"),
      ]);

      expect(acceptedFragments(result).map((f) => f.text)).toEqual(["une ", "rouge"]);
    });

    it("verdict is ok when a text-free fragment comes back self-closing", () => {
      const result = decodeThenCheck("<1>première</1><2/><3>seconde</3>", [
        fragment(1, "first"),
        fragment(2, null),
        fragment(3, "second"),
      ]);

      expect(result.ok).toBe(true);
    });

    it("verdict is ok when a text-free fragment comes back as an open/close pair", () => {
      const result = decodeThenCheck("<1>première</1><2></2><3>seconde</3>", [
        fragment(1, "first"),
        fragment(2, null),
        fragment(3, "second"),
      ]);

      expect(result.ok).toBe(true);
    });

    it("verdict: a text-free fragment comes back with an empty string", () => {
      const result = decodeThenCheck("<1>première</1><2/><3>seconde</3>", [
        fragment(1, "first"),
        fragment(2, null),
        fragment(3, "second"),
      ]);

      expect(acceptedFragments(result).map((f) => f.text)).toEqual(["première", "", "seconde"]);
    });
  });

  describe("restoring trimmed edges", () => {
    it("edge whitespace: a trailing space the model trimmed is restored", () => {
      const result = decodeThenCheck("<1>une</1><2>voiture</2>", [
        fragment(1, "a "),
        fragment(2, "car"),
      ]);

      expect(acceptedFragments(result)[0]?.text).toBe("une ");
    });

    it("edge whitespace: a leading space the model trimmed is restored", () => {
      const result = decodeThenCheck("<1>rouge</1><2>voiture</2>", [
        fragment(1, "red"),
        fragment(2, " car"),
      ]);

      expect(acceptedFragments(result)[1]?.text).toBe(" voiture");
    });

    it("edge whitespace: a space the model kept is not doubled", () => {
      const result = decodeThenCheck("<1>une </1><2>voiture</2>", [
        fragment(1, "a "),
        fragment(2, "car"),
      ]);

      expect(acceptedFragments(result)[0]?.text).toBe("une ");
    });

    it("edge whitespace: a fragment whose source had no edge space gains none", () => {
      const result = decodeThenCheck("<1>une</1><2>voiture</2>", [
        fragment(1, "a"),
        fragment(2, "car"),
      ]);

      expect(acceptedFragments(result)[0]?.text).toBe("une");
    });

    it("edge whitespace: an emptied fragment is left empty", () => {
      const result = decodeThenCheck("<1>une voiture rouge</1><2></2>", [
        fragment(1, "a "),
        fragment(2, " red car"),
      ]);

      expect(acceptedFragments(result)[1]?.text).toBe("");
    });
  });
});

describe("the plugin's check, on its own", () => {
  it("does not count text answered for a line break as text", () => {
    const sent = [fragment(1, "a"), fragment(2, null)];

    const result = checkSegments(
      [
        { id: 1, text: "" },
        { id: 2, text: "invented" },
      ],
      sent
    );

    expect(rejectionReason(result)).toBe("no-text");
  });

  it("drops the text answered for a line break", () => {
    const sent = [fragment(1, "a"), fragment(2, null)];

    const result = checkSegments(
      [
        { id: 1, text: "b" },
        { id: 2, text: "invented" },
      ],
      sent
    );

    expect(acceptedFragments(result)).toEqual([
      { id: 1, text: "b" },
      { id: 2, text: "" },
    ]);
  });

  it("restores edge spaces in an answer that kept its shape around a line break", () => {
    const sent = [fragment(1, "Klicken Sie "), fragment(2, null), fragment(3, "hier")];

    const result = checkSegments(
      [
        { id: 1, text: "Klicken Sie" },
        { id: 2, text: "" },
        { id: 3, text: "hier" },
      ],
      sent
    );

    expect(acceptedFragments(result).map((each) => each.text)).toEqual([
      "Klicken Sie ",
      "",
      "hier",
    ]);
  });

  it("does not restore edge spaces once the answer moved its pieces", () => {
    const sent = [fragment(1, "a "), fragment(2, "red"), fragment(3, " car")];

    const result = checkSegments(
      [
        { id: 1, text: "une" },
        { id: 3, text: "voiture" },
        { id: 2, text: "rouge" },
      ],
      sent
    );

    expect(acceptedFragments(result).map((each) => each.text)).toEqual(["une", "voiture", "rouge"]);
  });
});
