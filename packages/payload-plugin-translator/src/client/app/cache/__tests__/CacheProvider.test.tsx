// @vitest-environment jsdom
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TranslateKitConfig } from "../../../../types/wire/TranslateKitConfig.js";
import { CacheProvider } from "../CacheProvider.js";

vi.mock("@payloadcms/ui", () => ({ useConfig: () => ({ config: { routes: { api: "/api" } } }) }));

const config: TranslateKitConfig = {
  basePath: "/translate",
  abilities: { translate: true, cancel: true, runNow: true, staleness: true, translateField: true },
  collections: {},
};

describe("the admin's composition root", () => {
  it("gives each mount its own cache", () => {
    const seen: QueryClient[] = [];
    function RecordsCache() {
      seen.push(useQueryClient());
      return null;
    }

    render(
      <>
        <CacheProvider {...config}>
          <RecordsCache />
        </CacheProvider>
        <CacheProvider {...config}>
          <RecordsCache />
        </CacheProvider>
      </>
    );

    expect(new Set(seen).size).toBe(2);
  });
});
