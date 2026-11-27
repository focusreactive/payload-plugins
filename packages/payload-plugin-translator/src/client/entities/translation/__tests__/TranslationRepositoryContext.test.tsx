// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TranslationRepositoryMissingError } from "../api/TranslationRepositoryContext.js";
import { useQueueDocumentTranslation } from "../mutations/useQueueDocumentTranslation.js";

function QueuesTranslations() {
  useQueueDocumentTranslation();
  return null;
}

describe("the translation repository", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is refused by name outside its provider, and nothing is sent", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetch = vi.spyOn(globalThis, "fetch");

    expect(() =>
      render(
        <QueryClientProvider client={new QueryClient()}>
          <QueuesTranslations />
        </QueryClientProvider>
      )
    ).toThrow(TranslationRepositoryMissingError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
