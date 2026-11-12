// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLinkSuggestions } from "../../../src/components/SeoDrawer/links/useLinkSuggestions";
import type { AnalysisInput } from "../../../src/engine/types/analysis";

const formData = {
  content: {
    root: {
      children: [
        { type: "link", fields: { linkType: "internal", doc: { relationTo: "pages", value: 4 } } },
      ],
    },
  },
};

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api", admin: "/admin" } } }),
  useForm: () => ({ getData: () => formData }),
}));

const fetchMock = vi.fn();
const getInput = vi.fn(
  async (): Promise<AnalysisInput> =>
    ({ contentHtml: '<p>Payload CMS, see <a href="/x">x</a></p>' }) as AnalysisInput
);

const args = { collectionSlug: "posts", docId: "1", localeCode: "en", getInput };

const suggestion = {
  collection: "posts",
  id: "2",
  title: "Post two",
  phrase: "payload cms",
  count: 1,
  snippet: "Payload CMS, see x",
  snippetMatch: { start: 0, end: 11 },
  url: "/blog/two",
};

function deferred<T>() {
  let settle: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });

  return { promise, resolve: (value: T) => settle?.(value) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  getInput.mockClear();
});

afterEach(() => vi.unstubAllGlobals());

describe("useLinkSuggestions", () => {
  it("starts idle and does not request anything", () => {
    const { result } = renderHook(() => useLinkSuggestions(args));

    expect(result.current.state).toEqual({ status: "idle" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the live text and links, then exposes the suggestions", async () => {
    fetchMock.mockResolvedValue(Response.json({ suggestions: [suggestion] }));
    const { result } = renderHook(() => useLinkSuggestions(args));

    await act(() => result.current.find());

    const [url, init] = fetchMock.mock.calls[0];
    expect(getInput).toHaveBeenCalledWith({ live: true });
    expect(url).toBe("/api/seo/link-suggestions");
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(init.body)).toEqual({
      collection: "posts",
      docId: "1",
      locale: "en",
      text: "Payload CMS, see x",
      linkedHrefs: ["/x"],
      linkedDocs: [{ collection: "pages", docId: "4" }],
    });
    expect(result.current.state).toEqual({ status: "done", suggestions: [suggestion] });
  });

  it("treats a response without a list as no suggestions", async () => {
    fetchMock.mockResolvedValue(new Response("{}"));
    const { result } = renderHook(() => useLinkSuggestions(args));

    await act(() => result.current.find());

    expect(result.current.state).toEqual({ status: "done", suggestions: [] });
  });

  it("reports an error for a failed request", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const { result } = renderHook(() => useLinkSuggestions(args));

    await act(() => result.current.find());

    expect(result.current.state).toEqual({ status: "error" });
  });

  it("shows loading while the request runs", async () => {
    const response = deferred<Response>();
    fetchMock.mockReturnValue(response.promise);
    const { result } = renderHook(() => useLinkSuggestions(args));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.find();
    });
    expect(result.current.state).toEqual({ status: "loading" });

    await act(async () => {
      response.resolve(Response.json({ suggestions: [] }));
      await pending;
    });
    expect(result.current.state).toEqual({ status: "done", suggestions: [] });
  });

  it("ignores clicks while a request is in flight and allows a new one afterwards", async () => {
    const first = deferred<Response>();
    fetchMock
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(Response.json({ suggestions: [suggestion] }));
    const { result } = renderHook(() => useLinkSuggestions(args));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.find();
    });
    await act(() => result.current.find());
    await act(async () => {
      first.resolve(Response.json({ suggestions: [] }));
      await pending;
    });

    expect(getInput).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ status: "done", suggestions: [] });

    await act(() => result.current.find());
    expect(result.current.state).toEqual({ status: "done", suggestions: [suggestion] });
  });

  it("aborts the request on unmount", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { result, unmount } = renderHook(() => useLinkSuggestions(args));

    act(() => {
      void result.current.find();
    });
    await act(async () => {
      await Promise.resolve();
    });
    unmount();

    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
