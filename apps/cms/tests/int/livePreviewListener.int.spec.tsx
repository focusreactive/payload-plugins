import { act, render } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LivePreviewListener } from "@/components/LivePreviewListener";

const preview = vi.hoisted(() => ({
  pendingRefreshes: [] as (() => void)[],
  refreshesOnReady: 1,
  requestRefresh: () => {},
  routerRefresh: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();

  function useControllableTransition() {
    const [isPending, setIsPending] = react.useState(false);
    const startTransition = react.useCallback((action: () => void) => {
      setIsPending(true);
      action();
      preview.pendingRefreshes.push(() => setIsPending(false));
    }, []);

    return [isPending, startTransition] as const;
  }

  return { ...react, useTransition: useControllableTransition };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: preview.routerRefresh }),
}));

vi.mock("@payloadcms/live-preview-react", () => ({
  RefreshRouteOnSave: ({ refresh }: { refresh: () => void }) => {
    const hasSentReady = useRef(false);
    useEffect(() => {
      preview.requestRefresh = refresh;
      if (hasSentReady.current) return;
      hasSentReady.current = true;
      for (let request = 0; request < preview.refreshesOnReady; request += 1) {
        refresh();
      }
    }, [refresh]);
    return null;
  },
}));

function finishPendingRefresh() {
  act(() => preview.pendingRefreshes.shift()?.());
}

describe("LivePreviewListener", () => {
  beforeEach(() => {
    preview.routerRefresh.mockClear();
    preview.pendingRefreshes = [];
    preview.refreshesOnReady = 1;
  });

  it("refreshes the route when the preview asks right after the ready handshake", () => {
    render(<LivePreviewListener />);

    expect(preview.routerRefresh).toHaveBeenCalledOnce();
  });

  it("coalesces a burst of refresh requests into one route refresh", () => {
    preview.refreshesOnReady = 3;
    render(<LivePreviewListener />);

    expect(preview.routerRefresh).toHaveBeenCalledOnce();
  });

  it("refreshes once more after the pending refresh when requests arrive meanwhile", () => {
    render(<LivePreviewListener />);
    act(() => {
      preview.requestRefresh();
      preview.requestRefresh();
    });
    const refreshesWhilePending = preview.routerRefresh.mock.calls.length;

    finishPendingRefresh();
    const refreshesAfterFirstSettles = preview.routerRefresh.mock.calls.length;
    finishPendingRefresh();

    expect(refreshesWhilePending).toBe(1);
    expect(refreshesAfterFirstSettles).toBe(2);
    expect(preview.routerRefresh).toHaveBeenCalledTimes(2);
  });
});
