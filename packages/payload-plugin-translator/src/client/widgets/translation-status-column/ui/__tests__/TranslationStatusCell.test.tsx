// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import type { DefaultCellComponentProps } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DocumentSeed,
  WorldRules,
} from "../../../../entities/translation/__tests__/stub-world/model/index.js";
import { SCENARIOS } from "../../../../entities/translation/__tests__/stub-world/scenarios/index.js";
import type { Abilities } from "../../../../../types/wire/TranslateKitConfig.js";
import { InMemoryTranslationRepository } from "../../../../entities/translation/__tests__/InMemoryTranslationRepository.fixture.js";
import { TranslationRepositoryProvider } from "../../../../entities/translation/index.js";
import { TranslateKitConfigProvider } from "../../../../shared/config/index.js";

const LIST = vi.hoisted(() => ({
  data: {
    docs: [
      { id: 1, title: "Summer festival" },
      { id: 2, title: "Pricing" },
      { id: 3, title: "Careers" },
    ],
  },
  query: {},
}));

// `@payloadcms/ui` ships CSS imports Vitest cannot load; the cell reads only the list it sits in.
vi.mock("@payloadcms/ui", () => ({
  useListQuery: () => ({ collectionSlug: "pages", data: LIST.data, query: LIST.query }),
  useConfig: () => ({ getEntityConfig: () => ({ slug: "pages", admin: { useAsTitle: "title" } }) }),
}));

const TranslationStatusCell = (await import("../TranslationStatusCell.js")).default;

const AT = "2026-11-01T09:00:00.000Z";
const LOCALES = { source: "en", targets: ["de", "fr", "es"] };
const DOCUMENTS = ["1", "2", "3"].map((id) => ({ collection: "pages", id }));
const ABILITIES: Abilities = {
  translate: true,
  cancel: true,
  runNow: true,
  staleness: true,
  translateField: true,
};

const SEEDS: Record<string, DocumentSeed> = {
  "1": {
    contents: { de: { kind: "tracked", verdicts: {}, translatedAt: AT, sourceLocale: "en" } },
    run: null,
  },
  "2": { contents: { de: { kind: "filled" } }, run: { status: "queued", locales: ["fr", "es"] } },
  "3": { contents: {}, run: { status: "running", locales: ["de"] } },
};
const rules: WorldRules = {
  ...SCENARIOS.empty,
  seed: ({ id }) => SEEDS[id] ?? { contents: {}, run: null },
};

function showCells() {
  const repository = new InMemoryTranslationRepository(DOCUMENTS, LOCALES, rules);
  const getListState = vi.spyOn(repository, "getListState");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <TranslateKitConfigProvider
      config={{ basePath: "/translate", abilities: ABILITIES, collections: {} }}
    >
      <TranslationRepositoryProvider repository={repository}>
        <QueryClientProvider client={client}>
          <table>
            <tbody>
              {LIST.data.docs.map((doc) => (
                <tr key={doc.id} data-testid={`row-${doc.id}`}>
                  <td>
                    <TranslationStatusCell
                      {...({
                        rowData: doc,
                        collectionSlug: "pages",
                      } as unknown as DefaultCellComponentProps)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueryClientProvider>
      </TranslationRepositoryProvider>
    </TranslateKitConfigProvider>
  );
  return { getListState };
}

const chipsOf = async (id: string) => {
  const row = within(screen.getByTestId(`row-${id}`));
  return (await row.findAllByRole("listitem")).map((chip) => chip.textContent);
};

afterEach(cleanup);

describe("the translation status column", () => {
  it("marks each locale of its own row", async () => {
    showCells();

    const [de, ...rest] = await chipsOf("1");
    expect(de).toMatch(/^de: translated .+ ago$/u);
    expect(rest).toEqual(["fr: not translated", "es: not translated"]);
    expect(await chipsOf("2")).toEqual(["de: translated", "◷fr: queued", "◷es: queued"]);
    expect(await chipsOf("3")).toEqual([
      "⟳de: translating now",
      "fr: not translated",
      "es: not translated",
    ]);
  });

  it("reads the page once, whatever the number of cells", async () => {
    const { getListState } = showCells();
    await chipsOf("3");

    await waitFor(() => expect(getListState).toHaveBeenCalledTimes(1));
    expect(getListState).toHaveBeenCalledWith({ collection: "pages", ids: ["1", "2", "3"] });
  });
});
