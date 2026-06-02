import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsProvider } from "../../../src/types/provider";
import { ViewTracker } from "../../../src/client/Track/ViewTracker";

interface FakeObserverInstance {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  fire: (ratio: number) => void;
}

let lastObserver: FakeObserverInstance | null = null;

beforeEach(() => {
  lastObserver = null;
  class FakeIO {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(cb: (entries: { intersectionRatio: number }[]) => void) {
      const inst = this as unknown as FakeObserverInstance;
      inst.fire = (ratio: number) => cb([{ intersectionRatio: ratio }]);
      lastObserver = inst;
    }
  }
  // @ts-expect-error - intentional jsdom override
  globalThis.IntersectionObserver = FakeIO;
});

afterEach(() => {
  // @ts-expect-error - cleanup
  delete globalThis.IntersectionObserver;
});

function makeProvider(): AnalyticsProvider {
  return {
    name: "fake",
    Scripts: () => null,
    trackEvent: vi.fn(),
    pageView: vi.fn(),
  };
}

describe("<ViewTracker>", () => {
  it("fires once when intersectionRatio >= 0.5 and disconnects", () => {
    const provider = makeProvider();
    render(
      <ViewTracker event="card_view" payload={{ id: 1 }} provider={provider}>
        <div>card</div>
      </ViewTracker>
    );
    expect(lastObserver).not.toBeNull();
    lastObserver!.fire(0.6);
    lastObserver!.fire(0.9);
    expect(provider.trackEvent).toHaveBeenCalledTimes(1);
    expect(provider.trackEvent).toHaveBeenCalledWith("card_view", { id: 1 });
    expect(lastObserver!.disconnect).toHaveBeenCalled();
  });

  it("does not fire below threshold", () => {
    const provider = makeProvider();
    render(
      <ViewTracker event="x" provider={provider}>
        <div>card</div>
      </ViewTracker>
    );
    lastObserver!.fire(0.4);
    expect(provider.trackEvent).not.toHaveBeenCalled();
  });

  it("disconnects on unmount", () => {
    const provider = makeProvider();
    const { unmount } = render(
      <ViewTracker event="x" provider={provider}>
        <div>card</div>
      </ViewTracker>
    );
    unmount();
    expect(lastObserver!.disconnect).toHaveBeenCalled();
  });
});
