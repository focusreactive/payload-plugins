// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KeyphraseUsage,
  KeyphraseUsageNotice,
} from "../../src/components/SeoDrawer/tabs/keyphrase/KeyphraseUsageNotice";

let api: { data?: unknown; isLoading: boolean; isError: boolean } = {
  isLoading: false,
  isError: false,
};
const setParams = vi.fn();
const usePayloadAPI = vi.fn((..._args: unknown[]) => {
  const [state] = useState(() => api);
  return [state, { setParams }];
});

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api", admin: "/admin" } } }),
  useDebounce: <T,>(value: T) => value,
  useDocumentInfo: () => ({ collectionSlug: "posts", id: 1 }),
  usePayloadAPI: (...args: unknown[]) => usePayloadAPI(...args),
}));

afterEach(() => {
  cleanup();
  usePayloadAPI.mockClear();
  setParams.mockClear();
  api = { isLoading: false, isError: false };
});

const props = { collectionSlug: "posts", docId: "1", phrase: "payload cms" };

describe("KeyphraseUsageNotice", () => {
  it("asks the usage endpoint about the phrase", () => {
    render(<KeyphraseUsageNotice {...props} />);
    expect(usePayloadAPI).toHaveBeenCalledWith("/api/seo/keyphrase-usage", {
      initialParams: { collection: "posts", docId: "1", phrase: "payload cms" },
    });
  });

  it("renders nothing while loading, on error, or without matches", () => {
    for (const state of [
      { isLoading: true, isError: false },
      { isLoading: false, isError: true },
      { isLoading: false, isError: false, data: { docs: [] } },
    ]) {
      api = state;
      const { container } = render(<KeyphraseUsageNotice {...props} />);
      expect(container).toBeEmptyDOMElement();
      cleanup();
    }
  });

  it("lists the other documents with links to their edit views", () => {
    api = {
      isLoading: false,
      isError: false,
      data: { docs: [{ collection: "page", id: "7", title: "Home" }] },
    };
    render(<KeyphraseUsageNotice {...props} />);
    expect(screen.getByText(/already used on/iu)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/admin/collections/page/7"
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "rel",
      "noopener noreferrer"
    );
  });
});

describe("KeyphraseUsage", () => {
  it("queries the trimmed phrase and skips blank ones", () => {
    render(<KeyphraseUsage phrase="  " />);
    expect(usePayloadAPI).not.toHaveBeenCalled();

    render(<KeyphraseUsage phrase=" payload cms " />);
    expect(usePayloadAPI.mock.calls.at(-1)?.[1]).toEqual({
      initialParams: { collection: "posts", docId: "1", phrase: "payload cms" },
    });
  });

  it("keeps showing the previous documents while the next phrase loads", () => {
    api = {
      isLoading: false,
      isError: false,
      data: { docs: [{ collection: "page", id: "7", title: "Home" }] },
    };
    const { rerender } = render(<KeyphraseUsage phrase="a" />);

    api = { isLoading: true, isError: false };
    rerender(<KeyphraseUsage phrase="ab" />);

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(setParams).toHaveBeenLastCalledWith({ collection: "posts", docId: "1", phrase: "ab" });
  });
});
