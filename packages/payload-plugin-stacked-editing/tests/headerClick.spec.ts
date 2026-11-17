import { describe, expect, it } from "vitest";

import { OPEN_ICON_SIZE, classifyHeaderClick, openIconRect } from "../src/lib/headerClick.js";

const actionsWrap = { left: 900, right: 970, top: 100, bottom: 140 };
const chevron = { left: 946, right: 970, top: 108, bottom: 132 };
const at = (x: number, y = 120) => ({ x, y });

describe("classifyHeaderClick", () => {
  it("panel mode: the label opens a panel, the chevron toggles inline", () => {
    expect(classifyHeaderClick({ actionsWrap, chevron, mode: "panel", point: at(200) })).toBe(
      "panel"
    );
    expect(classifyHeaderClick({ actionsWrap, chevron, mode: "panel", point: at(958) })).toBe(
      "inline"
    );
    expect(classifyHeaderClick({ actionsWrap, chevron, mode: "panel", point: at(942) })).toBe(
      "inline"
    );
  });

  it("inline mode: only the open icon opens a panel", () => {
    expect(classifyHeaderClick({ actionsWrap, chevron, mode: "inline", point: at(200) })).toBe(
      "inline"
    );
    expect(classifyHeaderClick({ actionsWrap, chevron, mode: "inline", point: at(910) })).toBe(
      "panel"
    );
    expect(classifyHeaderClick({ actionsWrap, chevron, mode: "inline", point: at(958) })).toBe(
      "inline"
    );
  });

  it("keyboard activations follow the mode", () => {
    expect(classifyHeaderClick({ actionsWrap, chevron, mode: "panel", point: null })).toBe("panel");
    expect(classifyHeaderClick({ actionsWrap, chevron, mode: "inline", point: null })).toBe(
      "inline"
    );
  });

  it("works without measurable actions (read-only rows)", () => {
    expect(classifyHeaderClick({ mode: "panel", point: at(10) })).toBe("panel");
    expect(classifyHeaderClick({ mode: "inline", point: at(10) })).toBe("inline");
  });

  it("places the open icon at the start of the actions wrap", () => {
    expect(openIconRect(actionsWrap)).toEqual({
      left: 900,
      right: 900 + OPEN_ICON_SIZE,
      top: 100,
      bottom: 140,
    });
  });
});
