// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSegmentCheck } from "../../src/admin/Create/useSegmentCheck.js";
import type { SegmentStatus } from "../../src/admin/Create/useSegmentCheck.js";

// Written out, not imported: the 300 ms of the spec is what the test holds the hook to.
const segmentCheckDelayMs = 300;

type Answer = { message?: string; ok: boolean };

/** One pending `check-segment` call that the test answers when it likes. */
type PendingCall = {
  answer: (value: Answer) => void;
  segment: string;
  signal: AbortSignal | undefined;
};

let calls: PendingCall[] = [];

const fetchImplementation = ((input: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((resolve) => {
    const segment = new URL(String(input), "http://localhost").searchParams.get("segment") ?? "";
    calls.push({
      answer: (value) => resolve(Response.json(value)),
      segment,
      signal: init?.signal ?? undefined,
    });
  })) as typeof fetch;

const context = { baseUrl: "/api", fetchImplementation };

let root: Root | null = null;
let latest: SegmentStatus = { state: "idle" };

const Probe = ({ segment }: { segment: string }) => {
  latest = useSegmentCheck({ context, parent: 5, segment });

  return null;
};

const show = async (segment: string) => {
  if (root === null) {
    root = createRoot(document.createElement("div"));
  }
  const mounted = root;
  await act(async () => {
    mounted.render(createElement(Probe, { segment }));
  });
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  calls = [];
  latest = { state: "idle" };
});

afterEach(async () => {
  const mounted = root;
  root = null;
  if (mounted) {
    await act(async () => mounted.unmount());
  }
  vi.useRealTimers();
});

const advance = (milliseconds: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });

describe("useSegmentCheck", () => {
  it("asks the server only once typing has paused for the debounce time", async () => {
    await show("sum");
    await advance(segmentCheckDelayMs - 1);
    expect(calls).toHaveLength(0);

    // Typing on restarts the wait, so the first text is never asked about.
    await show("summer");
    await advance(segmentCheckDelayMs - 1);
    expect(calls).toHaveLength(0);

    await advance(1);
    expect(calls.map((call) => call.segment)).toEqual(["summer"]);
  });

  it("reads checking until the answer, then ok or taken", async () => {
    await show("summer");
    expect(latest.state).toBe("checking");
    await advance(segmentCheckDelayMs);
    expect(latest.state).toBe("checking");

    await act(async () => calls[0]?.answer({ ok: true }));
    expect(latest).toEqual({ state: "ok" });

    await show("autumn");
    await advance(segmentCheckDelayMs);
    await act(async () => calls[1]?.answer({ message: "/blog/autumn is taken", ok: false }));
    expect(latest).toEqual({ message: "/blog/autumn is taken", state: "taken" });
  });

  it("never reports ok for text typed after the answer it was given for", async () => {
    await show("summer");
    await advance(segmentCheckDelayMs);
    await act(async () => calls[0]?.answer({ ok: true }));
    expect(latest.state).toBe("ok");

    // The editor types on: the old answer must not count for the new text, not even for a moment.
    await show("summer-2");
    expect(latest.state).toBe("checking");
    await advance(segmentCheckDelayMs - 1);
    expect(latest.state).toBe("checking");
  });

  it("drops a late answer for old text, and aborts its request", async () => {
    await show("old-text");
    await advance(segmentCheckDelayMs);
    const stale = calls[0] as PendingCall;

    await show("new-text");
    expect(stale.signal?.aborted).toBe(true);
    // The old answer arrives after the text changed, and says it is free.
    await act(async () => stale.answer({ ok: true }));

    expect(latest.state).toBe("checking");
    await advance(segmentCheckDelayMs);
    expect(calls.map((call) => call.segment)).toEqual(["old-text", "new-text"]);
    await act(async () => calls[1]?.answer({ message: "taken", ok: false }));
    expect(latest).toEqual({ message: "taken", state: "taken" });
  });

  it("does not ask about a segment that is malformed, and says so at once", async () => {
    await show("Not A Segment");
    await advance(segmentCheckDelayMs * 3);

    expect(calls).toHaveLength(0);
    expect(latest.state).toBe("invalid");
  });

  it("is idle for an empty segment", async () => {
    await show("");
    await advance(segmentCheckDelayMs * 3);

    expect(calls).toHaveLength(0);
    expect(latest.state).toBe("idle");
  });
});
