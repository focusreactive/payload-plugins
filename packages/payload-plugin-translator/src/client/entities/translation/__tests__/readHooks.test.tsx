// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { TranslationRepositoryProvider } from "../api/TranslationRepositoryContext.js";
import { useDocumentTranslationState } from "../queries/useDocumentTranslationState.js";
import { useListTranslationState } from "../queries/useListTranslationState.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";
import { InMemoryTranslationRepository } from "./InMemoryTranslationRepository.fixture.js";

const LOCALES = { source: "en", targets: ["de", "fr"] };
const PAGE = ["1", "2", "3"];

function setup() {
  const repository = new InMemoryTranslationRepository(
    PAGE.map((id) => ({ collection: "pages", id })),
    LOCALES
  );
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={new QueryClient()}>
      <TranslationRepositoryProvider repository={repository}>
        {children}
      </TranslationRepositoryProvider>
    </QueryClientProvider>
  );
  return { repository, wrapper };
}

describe("the document translation state", () => {
  it("is the state the repository in context answers", async () => {
    const { repository, wrapper } = setup();
    const expected = await repository.getDocumentState({ collection: "pages", id: "1" });

    const { result } = renderHook(
      () => useDocumentTranslationState({ collection: "pages", id: "1" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data).toEqual(expected));
  });

  it("shows a run once one is enqueued and the reads are refreshed", async () => {
    const { repository, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        state: useDocumentTranslationState({ collection: "pages", id: "1" }),
        refresh: useRefreshTranslation(),
      }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.state.data).toBeDefined());

    await repository.enqueueDocument({
      source_lng: "en",
      target_lng: "de",
      collection_slug: "pages",
      collection_id: ["1"],
    });
    await act(() => result.current.refresh());

    await waitFor(() =>
      expect(
        result.current.state.data?.locales.find(({ locale }) => locale === "de")?.run
      ).toMatchObject({ status: "queued" })
    );
  });

  it("sends nothing while the document has no id", async () => {
    const { repository, wrapper } = setup();
    const read = vi.spyOn(repository, "getDocumentState");

    const { result } = renderHook(
      () => useDocumentTranslationState({ collection: "pages", id: undefined }),
      { wrapper }
    );

    await act(() => Promise.resolve());
    expect(read).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});

describe("the list translation state", () => {
  it("is read with one request for every id on the page", async () => {
    const { repository, wrapper } = setup();
    const read = vi.spyOn(repository, "getListState");

    const { result } = renderHook(
      () => useListTranslationState({ collection: "pages", ids: PAGE }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data?.docs).toHaveLength(PAGE.length));
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith({ collection: "pages", ids: PAGE });
  });

  it("sends nothing for an empty page", async () => {
    const { repository, wrapper } = setup();
    const read = vi.spyOn(repository, "getListState");

    renderHook(() => useListTranslationState({ collection: "pages", ids: [] }), { wrapper });

    await act(() => Promise.resolve());
    expect(read).not.toHaveBeenCalled();
  });
});
