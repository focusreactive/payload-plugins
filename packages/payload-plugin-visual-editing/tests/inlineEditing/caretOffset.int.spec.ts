import { describe, expect, it } from "vitest";

import { offsetOfTheSameText } from "../../src/client/inlineEditing/caret";

describe("the offset of a click in a text split into pieces, found again in the joined text", () => {
  it("lands after the same letters when the pieces drop or add spaces", () => {
    expect(offsetOfTheSameText("How We", "How  We Deliver")).toBe("How  We".length);
    expect(offsetOfTheSameText("HowWe", "How We Deliver")).toBe("How We".length);
  });

  it("lands after the spaces that follow the letters when the click came after a space", () => {
    expect(offsetOfTheSameText("How ", "How   We")).toBe("How   ".length);
  });

  it("counts a letter made of two code units, such as an emoji, as one letter", () => {
    expect(offsetOfTheSameText("😀 Ho", "😀 How")).toBe("😀 Ho".length);
    expect(offsetOfTheSameText("😀", "😀😀 Go")).toBe("😀".length);
  });

  it("lands at the start for a click before every letter", () => {
    expect(offsetOfTheSameText("", "How")).toBe(0);
  });
});
