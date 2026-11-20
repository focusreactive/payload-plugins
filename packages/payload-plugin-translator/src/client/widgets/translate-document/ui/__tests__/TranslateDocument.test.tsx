// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorldRules } from "../../../../../server/modules/translation-stub/model/index.js";
import { SCENARIOS } from "../../../../../server/modules/translation-stub/scenarios/index.js";
import type { ContentState } from "../../../../../types/wire/DocumentTranslationState.js";
import type { Abilities } from "../../../../../types/wire/TranslateKitConfig.js";
import { InMemoryTranslationRepository } from "../../../../entities/translation/__tests__/InMemoryTranslationRepository.fixture.js";
import { TranslationRepositoryProvider } from "../../../../entities/translation/index.js";
import { TranslateKitConfigProvider } from "../../../../shared/config/index.js";

const saved = vi.hoisted(() => ({ time: 0 }));

// `@payloadcms/ui` ships CSS imports Vitest cannot load; the panel reads only the save signal.
vi.mock("@payloadcms/ui", () => ({ useDocumentInfo: () => ({ lastUpdateTime: saved.time }) }));

const TranslateDocument = (await import("../TranslateDocument.js")).default;

const AT = "2026-11-01T09:00:00.000Z";
const LOCALES = { source: "en", targets: ["de", "fr", "es", "nl"] };
const CHOICES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "nl", label: "Nederlands" },
];
const DOCUMENT = { collection: "pages", id: "1" };
const EVERY_ABILITY: Abilities = {
  translate: true,
  cancel: true,
  runNow: true,
  staleness: true,
  translateField: true,
};

const LEAVES = [
  "title",
  "summary",
  "sections.b1.heading",
  "sections.b1.lead",
  "sections.b2.body",
  "sidebar.s1.text",
  "sidebar.s2.text",
  "meta.description",
];
const tracked = (overrides: Record<string, "drifted" | "unanswered">): ContentState => ({
  kind: "tracked",
  verdicts: { ...Object.fromEntries(LEAVES.map((leaf) => [leaf, "current"])), ...overrides },
  translatedAt: AT,
});

const CONTENTS: Record<string, ContentState> = {
  de: tracked({}),
  fr: tracked({
    summary: "drifted",
    "sections.b2.body": "unanswered",
    "meta.description": "unanswered",
  }),
  nl: { kind: "untracked" },
};

const seeded = (run: { status: "queued"; locales: string[] } | null = null): WorldRules => ({
  ...SCENARIOS.empty,
  seed: () => ({ contents: CONTENTS, run }),
});

function show({
  rules = seeded(),
  abilities = EVERY_ABILITY,
  id = DOCUMENT.id,
}: { rules?: WorldRules; abilities?: Abilities; id?: string } = {}) {
  const repository = new InMemoryTranslationRepository([DOCUMENT], LOCALES, rules);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (): ReactNode => (
    <TranslateKitConfigProvider
      config={{
        basePath: "/translate",
        abilities,
        collections: { pages: { autoTranslateTargets: ["de"] } },
      }}
    >
      <TranslationRepositoryProvider repository={repository}>
        <QueryClientProvider client={client}>
          <TranslateDocument collection={DOCUMENT.collection} id={id} locales={CHOICES} />
        </QueryClientProvider>
      </TranslationRepositoryProvider>
    </TranslateKitConfigProvider>
  );
  const view = render(tree());
  return { repository, rerender: () => view.rerender(tree()) };
}

async function openPanel() {
  fireEvent.click(await screen.findByRole("button", { name: /Open translations/u }));
  return screen.findByRole("dialog");
}

const rowOf = (dialog: HTMLElement, label: string) => {
  const row = within(dialog).getByText(label, { selector: "span" }).closest("li");
  if (!row) throw new Error(`no row for ${label}`);
  return within(row);
};

afterEach(() => {
  cleanup();
  saved.time = 0;
});

describe("the document panel", () => {
  it("shows one row per target locale, each in its own words", async () => {
    show();
    const dialog = await openPanel();
    await within(dialog).findByText("Deutsch", { selector: "span" });

    expect(rowOf(dialog, "Deutsch").getByText(/Up to date/u)).toBeTruthy();
    expect(rowOf(dialog, "Français").getByText("1 field behind")).toBeTruthy();
    expect(rowOf(dialog, "Français").getByText(/2 came back empty/u)).toBeTruthy();
    expect(rowOf(dialog, "Español").getByText("Not translated")).toBeTruthy();
    expect(rowOf(dialog, "Nederlands").getByText(/Written by hand/u)).toBeTruthy();
    expect(within(dialog).getByText(/Saved as drafts/u)).toBeTruthy();
    expect(
      within(dialog).getByText(/Auto-translates into de when English is published/u)
    ).toBeTruthy();
  });

  it("translates an empty locale whole, from the chosen source", async () => {
    const { repository } = show();
    const enqueue = vi.spyOn(repository, "enqueue");
    const dialog = await openPanel();

    fireEvent.click(await within(dialog).findByRole("button", { name: "Translate Español" }));

    await waitFor(() =>
      expect(enqueue).toHaveBeenCalledWith({
        source_lng: "en",
        target_lng: ["es"],
        collection_slug: "pages",
        collection_id: ["1"],
      })
    );
  });

  it("translates the fields picked in a tracked locale's tree, the ones behind preselected", async () => {
    const { repository } = show();
    const enqueue = vi.spyOn(repository, "enqueue");
    const dialog = await openPanel();

    fireEvent.click(await within(dialog).findByRole("button", { name: "Show Français fields" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Translate 3 fields into Français" })
    );

    await waitFor(() =>
      expect(enqueue).toHaveBeenCalledWith({
        source_lng: "en",
        target_lng: ["fr"],
        collection_slug: "pages",
        collection_id: ["1"],
        filters: [
          { kind: "leaves", addresses: ["summary", "sections.b2.body", "meta.description"] },
        ],
      })
    );
  });

  it("opens the picker for a locale written by hand, with nothing ticked", async () => {
    show();
    const dialog = await openPanel();

    fireEvent.click(await within(dialog).findByRole("button", { name: "Show Nederlands fields" }));

    expect(within(dialog).getAllByRole("checkbox").length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/0 of 8 fields/u)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /Translate 0 fields/u })).toBeTruthy();
  });

  it("translates only the fields ticked in a locale written by hand", async () => {
    const { repository } = show();
    const enqueue = vi.spyOn(repository, "enqueue");
    const dialog = await openPanel();

    fireEvent.click(await within(dialog).findByRole("button", { name: "Show Nederlands fields" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Summary" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Translate 1 fields into Nederlands" })
    );

    await waitFor(() =>
      expect(enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          target_lng: ["nl"],
          filters: [{ kind: "leaves", addresses: ["summary"] }],
        })
      )
    );
  });

  it("shows an empty locale's tree without checkboxes, to translate whole", async () => {
    show();
    const dialog = await openPanel();

    fireEvent.click(await within(dialog).findByRole("button", { name: "Show Español fields" }));

    expect(within(dialog).getByText(/The whole document, 8 fields/u)).toBeTruthy();
    expect(within(dialog).queryAllByRole("checkbox")).toEqual([]);
    expect(
      within(dialog).getByRole("button", { name: "Translate all 8 fields into Español" })
    ).toBeTruthy();
  });

  it("blocks every start while a run is live, but not the run's own controls", async () => {
    show({ rules: seeded({ status: "queued", locales: ["de"] }) });
    const dialog = await openPanel();

    const cancel = await within(dialog).findByRole("button", { name: "Cancel the run for de" });
    expect(cancel).toHaveProperty("disabled", false);
    expect(within(dialog).getByRole("button", { name: "Translate Español" })).toHaveProperty(
      "disabled",
      true
    );
    expect(within(dialog).getByRole("button", { name: "Translate all" })).toHaveProperty(
      "disabled",
      true
    );
  });

  it("shows a busy answer beside the control that met it", async () => {
    const { repository } = show();
    const dialog = await openPanel();
    const translate = await within(dialog).findByRole("button", { name: "Translate Español" });

    await repository.enqueue({
      source_lng: "en",
      target_lng: "es",
      collection_slug: "pages",
      collection_id: ["1"],
    });
    fireEvent.click(translate);

    expect((await within(dialog).findByRole("alert")).textContent).toMatch(/Already translating/u);
  });

  it("does not render Run now or Cancel where the server cannot perform them", async () => {
    show({
      rules: seeded({ status: "queued", locales: ["de"] }),
      abilities: { ...EVERY_ABILITY, cancel: false, runNow: false },
    });
    const dialog = await openPanel();

    await within(dialog).findByText("Queued");
    expect(within(dialog).queryByRole("button", { name: /Cancel/u })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /Run now/u })).toBeNull();
  });

  it("reads the state again once Payload saves the document", async () => {
    const { repository, rerender } = show();
    await openPanel();
    const read = vi.spyOn(repository, "getDocumentState");

    saved.time = 1;
    rerender();

    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  });

  it("says the status could not be read, and still offers Translate all", async () => {
    show({ id: "missing" });
    const dialog = await openPanel();

    expect(await within(dialog).findByText(/Couldn’t load the translation status/u)).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Translate all" })).toHaveProperty(
      "disabled",
      false
    );
  });
});
