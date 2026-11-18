import { describe, it, expect } from "vitest";

import { describePanelStatus, MARKER_DOT } from "../panelStatus.js";

describe("describePanelStatus", () => {
  it("maps each kind to a tone + title, and uses the fallback title for none/undefined", () => {
    expect(describePanelStatus({ kind: "failed" }, "fb").tone).toBe("failed");
    expect(describePanelStatus({ kind: "running" }, "fb").tone).toBe("running");
    expect(describePanelStatus({ kind: "fresh" }, "fb").tone).toBe("fresh");
    expect(describePanelStatus({ kind: "stale", staleLocales: ["DE", "fr"] }, "fb")).toEqual({
      tone: "stale",
      title: "Out of date: de, fr",
    });
    expect(describePanelStatus({ kind: "none" }, "fb")).toEqual({ title: "fb" });
    expect(describePanelStatus(undefined, "fb")).toEqual({ title: "fb" });
  });
});

describe("MARKER_DOT", () => {
  it("colours each tone and pulses only in-progress", () => {
    expect(MARKER_DOT.failed).toEqual({ color: "red" });
    expect(MARKER_DOT.running).toEqual({ color: "blue", animated: true });
    expect(MARKER_DOT.stale).toEqual({ color: "amber" });
    expect(MARKER_DOT.fresh).toEqual({ color: "green" });
  });
});
