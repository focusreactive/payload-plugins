// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeoButton } from "../../src/components/SeoButton";

interface ApiState {
  data?: unknown;
  isLoading: boolean;
  isError: boolean;
}

const loading: ApiState = { isLoading: true, isError: false };

let docInfo: { id?: string | number } = {};
let locale = { code: "en" };
let respond: (state: ApiState) => void = () => undefined;
const usePayloadAPI = vi.fn((..._args: unknown[]) => {
  const [state, setState] = useState(loading);
  respond = setState;
  return [state, { setParams: vi.fn() }];
});

function respondWith(keyphrases: unknown[], indexed = true, canUpdate = true) {
  act(() =>
    respond({ isLoading: false, isError: false, data: { keyphrases, indexed, canUpdate } })
  );
}

vi.mock("@payloadcms/ui", () => ({
  Button: (p: { "aria-label"?: string; disabled?: boolean }) => (
    <button aria-label={p["aria-label"]} disabled={p.disabled} type="button" />
  ),
  useDocumentInfo: () => docInfo,
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useLocale: () => locale,
  usePayloadAPI: (...args: unknown[]) => usePayloadAPI(...args),
}));

const innerProps = vi.fn();
vi.mock("../../src/components/SeoButton/SeoButtonInner", () => ({
  SeoButtonInner: (p: Record<string, unknown>) => {
    innerProps(p);
    return <div data-testid="seo-inner" />;
  },
}));

const props = {
  collectionSlug: "pages",
  fields: {},
  extractContentPath: "@/x#default",
  site: { name: "Site", baseUrl: "https://example.com", faviconUrl: "" },
  supportedLocales: ["en"],
  keyphraseIndex: false,
};

afterEach(() => {
  cleanup();
  docInfo = {};
  locale = { code: "en" };
  usePayloadAPI.mockClear();
  innerProps.mockClear();
});

describe("SeoButton create-view gate", () => {
  it("renders nothing on the create view (no document id)", () => {
    docInfo = {};
    render(<SeoButton {...props} />);
    expect(screen.queryByTestId("seo-inner")).not.toBeInTheDocument();
  });

  it("mounts the analysis inner for a saved document (id present)", () => {
    docInfo = { id: "65f0a1b2c3d4e5f6a7b8c9d0" };
    render(<SeoButton {...props} />);
    expect(screen.getByTestId("seo-inner")).toBeInTheDocument();
  });

  it("mounts the inner for a numeric document id", () => {
    docInfo = { id: 7 };
    render(<SeoButton {...props} />);
    expect(screen.getByTestId("seo-inner")).toBeInTheDocument();
  });
});

describe("SeoButton keyphrase index gate", () => {
  it("does not call the API without the index", () => {
    docInfo = { id: "1" };
    render(<SeoButton {...props} />);
    expect(usePayloadAPI).not.toHaveBeenCalled();
    expect(innerProps.mock.calls.at(-1)?.[0].remote).toBeUndefined();
  });

  it("shows a disabled button while the row loads", () => {
    docInfo = { id: "1" };
    render(<SeoButton {...props} keyphraseIndex />);
    expect(screen.getByRole("button", { name: "SEO Analytics" })).toBeDisabled();

    respondWith([]);
    expect(screen.queryByRole("button", { name: "SEO Analytics" })).not.toBeInTheDocument();
    expect(screen.getByTestId("seo-inner")).toBeInTheDocument();
  });

  it("waits for the row, then mounts the inner with the server list", () => {
    docInfo = { id: "1" };
    render(<SeoButton {...props} keyphraseIndex />);
    expect(screen.queryByTestId("seo-inner")).not.toBeInTheDocument();
    expect(usePayloadAPI).toHaveBeenCalledWith("/api/seo/keyphrases", {
      initialParams: { collection: "pages", docId: "1" },
    });

    respondWith([{ text: "a", synonyms: [] }]);
    expect(innerProps.mock.calls.at(-1)?.[0].remote).toEqual({
      apiRoute: "/api",
      initial: [{ text: "a", synonyms: [] }],
      indexed: true,
      canUpdate: true,
    });
  });

  it("passes on that the server has no row yet", () => {
    docInfo = { id: "1" };
    render(<SeoButton {...props} keyphraseIndex />);
    respondWith([], false);
    expect(innerProps.mock.calls.at(-1)?.[0].remote).toEqual({
      apiRoute: "/api",
      initial: [],
      indexed: false,
      canUpdate: true,
    });
  });

  it("passes on that the user cannot update the document", () => {
    docInfo = { id: "1" };
    render(<SeoButton {...props} keyphraseIndex />);
    respondWith([], true, false);
    expect(innerProps.mock.calls.at(-1)?.[0].remote.canUpdate).toBe(false);
  });

  it("falls back to browser storage when the request fails", () => {
    docInfo = { id: "1" };
    render(<SeoButton {...props} keyphraseIndex />);
    act(() => respond({ isLoading: false, isError: true }));
    expect(screen.getByTestId("seo-inner")).toBeInTheDocument();
    expect(innerProps.mock.calls.at(-1)?.[0].remote).toBeUndefined();
  });

  it("reloads the row when the locale changes instead of reusing the previous list", () => {
    docInfo = { id: "1" };
    const { rerender } = render(<SeoButton {...props} keyphraseIndex />);
    respondWith([{ text: "english", synonyms: [] }]);
    innerProps.mockClear();

    locale = { code: "de" };
    rerender(<SeoButton {...props} keyphraseIndex />);
    expect(screen.queryByTestId("seo-inner")).not.toBeInTheDocument();
    expect(innerProps).not.toHaveBeenCalled();

    respondWith([{ text: "deutsch", synonyms: [] }]);
    expect(innerProps.mock.calls.at(-1)?.[0].remote.initial).toEqual([
      { text: "deutsch", synonyms: [] },
    ]);
  });

  it("reloads the row when the document changes", () => {
    docInfo = { id: "1" };
    const { rerender } = render(<SeoButton {...props} keyphraseIndex />);
    respondWith([{ text: "first", synonyms: [] }]);
    innerProps.mockClear();

    docInfo = { id: "2" };
    rerender(<SeoButton {...props} keyphraseIndex />);
    expect(screen.queryByTestId("seo-inner")).not.toBeInTheDocument();
    expect(innerProps).not.toHaveBeenCalled();
    expect(usePayloadAPI).toHaveBeenLastCalledWith("/api/seo/keyphrases", {
      initialParams: { collection: "pages", docId: "2" },
    });
  });
});
