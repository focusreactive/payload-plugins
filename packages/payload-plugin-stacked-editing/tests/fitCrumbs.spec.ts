import { describe, expect, it } from "vitest";

import { fitCrumbs } from "../src/lib/breadcrumbs.js";

const widths = [50, 70, 140, 50, 110, 60, 70];
const total = widths.reduce((sum, width) => sum + width, 0);

describe("fitCrumbs", () => {
  it("shows the whole trail when it fits", () => {
    expect(fitCrumbs({ available: total, ellipsisWidth: 30, widths })).toEqual({
      visible: [0, 1, 2, 3, 4, 5, 6],
      hidden: [],
    });
  });

  it("folds the middle and keeps as many trailing crumbs as fit", () => {
    expect(fitCrumbs({ available: 330, ellipsisWidth: 30, widths })).toEqual({
      visible: [0, 4, 5, 6],
      hidden: [1, 2, 3],
    });
  });

  it("first / … / parent / current, then first / … / current", () => {
    expect(fitCrumbs({ available: 215, ellipsisWidth: 30, widths })).toEqual({
      visible: [0, 5, 6],
      hidden: [1, 2, 3, 4],
    });
    expect(fitCrumbs({ available: 160, ellipsisWidth: 30, widths })).toEqual({
      visible: [0, 6],
      hidden: [1, 2, 3, 4, 5],
    });
  });

  it("keeps first and current even when they do not fit (the current one truncates)", () => {
    expect(fitCrumbs({ available: 40, ellipsisWidth: 30, widths })).toEqual({
      visible: [0, 6],
      hidden: [1, 2, 3, 4, 5],
    });
  });

  it("never folds a trail of one or two crumbs", () => {
    expect(fitCrumbs({ available: 10, ellipsisWidth: 30, widths: [80, 90] })).toEqual({
      visible: [0, 1],
      hidden: [],
    });
  });
});
