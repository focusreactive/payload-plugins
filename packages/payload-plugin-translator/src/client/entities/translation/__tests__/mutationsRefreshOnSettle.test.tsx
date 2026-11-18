// @vitest-environment jsdom
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "../../../shared/api/errors/ApiRequestError.js";
import { TranslationRepositoryProvider } from "../api/TranslationRepositoryContext.js";
import { useQueueDocumentTranslation } from "../mutations/useQueueDocumentTranslation.js";
import { useRunDocumentTranslation } from "../mutations/useRunDocumentTranslation.js";
import { translationKeys } from "../queries/translationKeys.js";
import { InMemoryTranslationRepository } from "./InMemoryTranslationRepository.fixture.js";

const LOCALES = { source: "en", targets: ["de", "fr"] };

function setup() {
  const repository = new InMemoryTranslationRepository([{ collection: "pages", id: "1" }], LOCALES);
  const read = vi.fn(() => repository.getDocumentState({ collection: "pages", id: "1" }));
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={new QueryClient()}>
      <TranslationRepositoryProvider repository={repository}>
        {children}
      </TranslationRepositoryProvider>
    </QueryClientProvider>
  );
  const { result } = renderHook(
    () => ({
      state: useQuery({ queryKey: translationKeys.document("pages", "1"), queryFn: read }),
      enqueue: useQueueDocumentTranslation(),
      runNow: useRunDocumentTranslation(),
    }),
    { wrapper }
  );
  return { result, read };
}

const enqueueDe = {
  source_lng: "en",
  target_lng: "de",
  collection_slug: "pages",
  collection_id: ["1"],
};

const rejectionOf = async (action: () => Promise<unknown>): Promise<unknown> => {
  try {
    await action();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe("an action refreshes the translation reads when it settles", () => {
  it("after it succeeds", async () => {
    const { result, read } = setup();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));

    await act(() => result.current.enqueue.mutateAsync(enqueueDe));

    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(
      result.current.state.data?.locales.find(({ locale }) => locale === "de")?.run
    ).toBeTruthy();
  });

  it("after the server refuses it as busy, so the screen shows the run that made it busy", async () => {
    const { result, read } = setup();
    await act(() => result.current.enqueue.mutateAsync(enqueueDe));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));

    const refusal = await act(() =>
      rejectionOf(() => result.current.enqueue.mutateAsync(enqueueDe))
    );

    expect(refusal).toBeInstanceOf(ApiRequestError);
    expect(refusal).toMatchObject({ reason: "busy" });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(3));
  });

  it("after it fails for any other reason", async () => {
    const { result, read } = setup();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));

    const failure = await act(() =>
      rejectionOf(() =>
        result.current.runNow.mutateAsync({ document: { collection: "pages", id: "no-run" } })
      )
    );

    expect(failure).toMatchObject({ reason: "not-found" });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  });
});
