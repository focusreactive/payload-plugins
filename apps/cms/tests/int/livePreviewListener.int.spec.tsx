import { render } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LivePreviewListener } from "@/components/LivePreviewListener";

const preview = vi.hoisted(() => ({
  refreshesOnReady: 1,
  routerRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: preview.routerRefresh }),
}));

vi.mock("@payloadcms/live-preview-react", () => ({
  RefreshRouteOnSave: ({ refresh }: { refresh: () => void }) => {
    useEffect(() => {
      for (let request = 0; request < preview.refreshesOnReady; request += 1) {
        refresh();
      }
    }, [refresh]);
    return null;
  },
}));

describe("LivePreviewListener", () => {
  beforeEach(() => {
    preview.routerRefresh.mockClear();
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
});
