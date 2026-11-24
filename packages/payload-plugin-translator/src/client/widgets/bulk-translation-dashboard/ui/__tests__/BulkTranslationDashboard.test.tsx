// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

const PAYLOAD = vi.hoisted(() => ({
  list: {
    data: {
      docs: [
        { id: 1, title: "Summer festival" },
        { id: 2, title: "Pricing" },
        { id: 3, title: "Contact" },
      ],
    },
    query: { search: "", where: { _status: { equals: "published" } } },
  },
  selection: { selected: [] as (string | number)[], selectAll: "none" },
}));

// `@payloadcms/ui` ships CSS imports Vitest cannot load; the toolbar reads the list and its selection.
vi.mock("@payloadcms/ui", () => ({
  useListQuery: () => ({
    collectionSlug: "pages",
    data: PAYLOAD.list.data,
    query: PAYLOAD.list.query,
  }),
  useConfig: () => ({
    config: { routes: { api: "/api" } },
    getEntityConfig: () => ({ slug: "pages", admin: { useAsTitle: "title" } }),
  }),
  useSelection: () => ({
    count: PAYLOAD.selection.selected.length,
    selectedIDs: PAYLOAD.selection.selected,
    selectAll: PAYLOAD.selection.selectAll,
  }),
  useLocale: () => ({ code: "en" }),
}));
vi.mock("@payloadcms/ui/providers/Selection", () => ({
  SelectAllStatus: {
    AllAvailable: "allAvailable",
    AllInPage: "allInPage",
    None: "none",
    Some: "some",
  },
}));

const BulkTranslationDashboard = (await import("../BulkTranslationDashboard.js")).default;

const LOCALES = { source: "en", targets: ["de", "fr", "es"] };
const CHOICES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];
const DOCUMENTS = ["1", "2", "3"].map((id) => ({ collection: "pages", id }));
const EVERY_ABILITY: Abilities = {
  translate: true,
  cancel: true,
  runNow: true,
  staleness: true,
  translateField: true,
};

const SEEDS: Record<string, DocumentSeed> = {
  "2": { contents: {}, run: { status: "queued", locales: ["de"] } },
};
const rules: WorldRules = {
  ...SCENARIOS.empty,
  seed: ({ id }) => SEEDS[id] ?? { contents: {}, run: null },
};

function show({
  selected = [],
  abilities = EVERY_ABILITY,
}: { selected?: (string | number)[]; abilities?: Abilities } = {}) {
  PAYLOAD.selection.selected = selected;
  const repository = new InMemoryTranslationRepository(DOCUMENTS, LOCALES, rules);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <TranslateKitConfigProvider
      config={{
        basePath: "/translate",
        abilities,
        collections: { pages: { autoTranslateTargets: [] } },
      }}
    >
      <TranslationRepositoryProvider repository={repository}>
        <QueryClientProvider client={client}>
          <BulkTranslationDashboard collection="pages" locales={CHOICES} defaultLocale="en" />
        </QueryClientProvider>
      </TranslationRepositoryProvider>
    </TranslateKitConfigProvider>
  );
  return { repository, enqueue: vi.spyOn(repository, "enqueue") };
}

async function openPanel(name: RegExp) {
  fireEvent.click(await screen.findByRole("button", { name }));
  return within(await screen.findByRole("dialog"));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  PAYLOAD.selection.selectAll = "none";
});

describe("the collection panel", () => {
  it("counts the ticked rows and queues them, skipping one with a live run", async () => {
    const { enqueue } = show({ selected: [1, 2] });
    const panel = await openPanel(/^Translate · 2$/u);

    expect(panel.getByRole("heading", { name: "Translate 2 documents" })).toBeTruthy();
    expect(await panel.findByText("queued or translating — skipped")).toBeTruthy();
    fireEvent.click(panel.getByRole("checkbox", { name: "Español" }));
    expect(
      panel.getByText(
        /2 translations will be queued — 1 document into 2 locales\. A document already/u
      )
    ).toBeTruthy();

    fireEvent.click(panel.getByRole("button", { name: "Translate" }));

    await waitFor(() =>
      expect(enqueue).toHaveBeenCalledWith({
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "pages",
        collection_id: ["1"],
      })
    );
  });

  it("drops a document removed from the selection", async () => {
    show({ selected: [1, 3] });
    const panel = await openPanel(/^Translate · 2$/u);

    fireEvent.click(
      panel.getByRole("button", { name: "Remove Summer festival from the selection" })
    );

    expect(panel.getByRole("heading", { name: "Translate 1 document" })).toBeTruthy();
    expect(panel.queryByText("Summer festival")).toBeNull();
    expect(
      panel.getByText(/3 translations will be queued — 1 document into 3 locales/u)
    ).toBeTruthy();
  });

  it("asks for only what is behind the source when that is ticked", async () => {
    const { enqueue } = show({ selected: [3] });
    const panel = await openPanel(/^Translate · 1$/u);

    fireEvent.click(panel.getByRole("checkbox", { name: "Only what is behind the source" }));
    fireEvent.click(panel.getByRole("button", { name: "Translate" }));

    await waitFor(() =>
      expect(enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ filters: [{ kind: "rule", name: "stale" }] })
      )
    );
  });

  it("offers neither Cancel queued nor the behind option without the abilities", async () => {
    show({ selected: [3], abilities: { ...EVERY_ABILITY, cancel: false, staleness: false } });

    expect(screen.queryByRole("button", { name: "Cancel queued" })).toBeNull();
    const panel = await openPanel(/^Translate · 1$/u);
    expect(panel.queryByRole("checkbox", { name: "Only what is behind the source" })).toBeNull();
  });

  it("cancels the collection's queued runs", async () => {
    const { repository } = show();
    const cancel = vi.spyOn(repository, "cancelByCollection");

    fireEvent.click(await screen.findByRole("button", { name: "Cancel queued" }));

    await waitFor(() => expect(cancel).toHaveBeenCalledWith("pages"));
  });

  it("shows a busy answer as the error", async () => {
    const { repository } = show({ selected: [1] });
    const panel = await openPanel(/^Translate · 1$/u);
    await repository.enqueue({
      source_lng: "en",
      target_lng: ["de"],
      collection_slug: "pages",
      collection_id: ["1"],
    });

    fireEvent.click(panel.getByRole("button", { name: "Translate" }));

    expect((await panel.findByRole("alert")).textContent).toMatch(/Already translating/u);
  });
});

describe("with nothing ticked", () => {
  it("takes every document the view's query matches, and sends them by id", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ docs: [{ id: 1 }, { id: 3 }] })
    );
    vi.stubGlobal("fetch", fetch);
    const { enqueue } = show();
    const panel = await openPanel(/^Translate$/u);

    fireEvent.click(await panel.findByRole("button", { name: "Continue with all 2" }));
    const url = new URL(String(fetch.mock.calls[0]?.[0]), "http://admin.test");
    expect(url.pathname).toBe("/api/pages");
    expect(JSON.parse(url.searchParams.get("where") ?? "")).toEqual(PAYLOAD.list.query.where);

    fireEvent.click(await panel.findByRole("button", { name: "Translate" }));
    await waitFor(() =>
      expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ collection_id: ["1", "3"] }))
    );
  });

  it("goes back to the list", async () => {
    show();
    const panel = await openPanel(/^Translate$/u);

    fireEvent.click(panel.getByRole("button", { name: "Back to the list" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
