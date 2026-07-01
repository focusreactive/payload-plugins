// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalysis } from "../../src/components/SeoDrawer/useAnalysis";
import { KeyphraseTab } from "../../src/components/SeoDrawer/tabs/KeyphraseTab";
import { useKeyphrases } from "../../src/components/SeoDrawer/useKeyphrases";
import { useLiveDocument } from "../../src/components/SeoDrawer/useLiveDocument";

// Resolvers for in-flight analyses so we can observe the transient (pending) UI.
let packResolvers: Array<() => void> = [];
const flushAnalyses = () =>
  act(() => {
    const pending = packResolvers;
    packResolvers = [];
    for (const resolve of pending) resolve();
  });

vi.mock("@payloadcms/ui", () => ({
  useAllFormFields: () => [{}],
  useConfig: () => ({ config: { routes: { api: "" } } }),
  useLocale: () => ({ code: "en" }),
  // No debounce in the test — a keyphrase edit changes the signature immediately.
  useDebounce: <T,>(value: T) => value,
}));

vi.mock("../../src/content/registry", () => ({
  resolveContentExtractor: () => () => Promise.resolve([]),
}));

// getInput echoes the current focus text into input.keyphrase (like the real build).
vi.mock("../../src/components/SeoDrawer/build-analysis-input", () => ({
  buildAnalysisInput: (args: { keyphrases: Array<{ text: string; synonyms: string[] }> }) =>
    Promise.resolve({
      title: "",
      slug: "",
      description: "",
      contentHtml: "",
      keyphrase: args.keyphrases[0]?.text ?? "",
      keyphrases: args.keyphrases,
      locale: "en_US",
      site: { name: "", baseUrl: "" },
      has: { seoTitle: false, metaDescription: false, slug: false, content: false },
    }),
}));

// Hold each analysis in flight until the test flushes it.
vi.mock("../../src/components/SeoDrawer/languagePacks", () => ({
  ensureLanguagePack: () =>
    new Promise<void>((resolve) => {
      packResolvers.push(resolve);
    }),
}));

// Deterministic result keyed to the analysed focus text, mirroring how the real
// engine derives relatedKeyphrases from input.keyphrases.slice(1).
vi.mock("../../src/engine/runAnalysis", () => ({
  runAnalysis: (input: {
    keyphrase: string;
    keyphrases: Array<{ text: string; synonyms: string[] }>;
  }) => ({
    overall: { seoScore: 50, status: "warn" },
    keyphraseText: input.keyphrase,
    keyphrase: {
      ringScore: input.keyphrase ? 77 : 100,
      status: "good",
      checks: [],
    },
    relatedKeyphrases: input.keyphrases
      .slice(1)
      .filter((k) => k.text.trim().length > 0)
      .map((k) => ({
        text: k.text,
        result: { ringScore: 55, status: "warn", checks: [] },
      })),
    onPage: { ringScore: 50, status: "warn", checks: [] },
    readability: { ringScore: 50, status: "warn", checks: [] },
    inclusive: { ringScore: 100, status: "good", categories: [], cleanCategories: [] },
    vitals: {
      words: 0,
      sentences: 0,
      paragraphs: 0,
      images: 0,
      videos: 0,
      readingTimeMinutes: 0,
      prominentWords: [],
      headings: { total: 0, levels: [], tree: [] },
    },
    serp: { title: "", url: "", description: "", siteName: "" },
  }),
}));

function Harness() {
  const kp = useKeyphrases({ collectionSlug: "pages", docId: "1", localeCode: "en" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { signature, getInput } = useLiveDocument({
    collectionSlug: "pages",
    fields: {},
    site: { name: "", baseUrl: "" },
    keyphrases: kp.keyphrases,
    extractContentPath: "x",
  });
  const { result, analyzing } = useAnalysis({ getInput, signature, supportedLocales: ["en"] });

  // Mirror SeoButtonInner: adding selects the new entry.
  const handleAddRelated = () => {
    const id = kp.addRelated();
    if (id) setSelectedId(id);
  };

  return (
    <KeyphraseTab
      keyphrases={kp.keyphrases}
      selectedId={selectedId}
      onSelect={setSelectedId}
      result={result}
      analyzing={analyzing}
      onAddRelated={handleAddRelated}
      onTextChange={kp.updateText}
      onAddSynonym={kp.addSynonym}
      onRemoveSynonym={kp.removeSynonym}
      onRemove={kp.remove}
      onSetFocus={kp.setFocus}
      isDuplicate={kp.isDuplicate}
    />
  );
}

const typeFocus = (value: string) =>
  act(() => {
    fireEvent.change(screen.getByLabelText(/focus keyphrase/i), { target: { value } });
  });

beforeEach(() => {
  localStorage.clear();
  packResolvers = [];
});
afterEach(() => cleanup());

describe("keyphrase analysis flow (real hooks)", () => {
  it("empty focus → first character shows the analyzing loader, never a stale/100 score", async () => {
    render(<Harness />);
    await flushAnalyses(); // settle the initial empty-keyphrase analysis (keyphraseText "")

    await typeFocus("a"); // a fresh analysis is now in flight; result is still the empty one

    // Transient: loader, not the empty-state score 100.
    expect(screen.getByRole("status")).toHaveTextContent(/analyzing keyphrase/i);
    expect(screen.queryByText("100")).toBeNull();

    await flushAnalyses();
    // Settled: the loader is gone and the real metrics (77) are shown.
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(screen.getAllByText("77").length).toBeGreaterThan(0);
  });

  it("editing a focus keyphrase that has metrics keeps the previous metrics dimmed (no loader)", async () => {
    const { container } = render(<Harness />);
    await flushAnalyses(); // empty settled
    await typeFocus("seo");
    await flushAnalyses(); // "seo" analysed → metrics 77
    await waitFor(() => expect(screen.getAllByText("77").length).toBeGreaterThan(0));

    await typeFocus("seob"); // edit; re-analysis in flight, result still for "seo"

    // The previous metrics stay visible inside a dimmed container, and no
    // "Analyzing keyphrase…" loader is shown.
    expect(screen.queryByText(/analyzing keyphrase/i)).toBeNull();
    const dimmed = container.querySelector(".opacity-40");
    expect(dimmed).toBeTruthy();
    expect(dimmed).toHaveTextContent("77");
  });

  it("a related keyphrase resolves to its own metrics (does not stay 'analyzing')", async () => {
    render(<Harness />);
    await flushAnalyses(); // settle empty focus
    await typeFocus("seo");
    await flushAnalyses(); // focus analysed

    // Add a related keyphrase (selects it) and type into it.
    await act(() => {
      fireEvent.click(screen.getByRole("button", { name: /add related keyphrase/i }));
    });
    await act(() => {
      fireEvent.change(screen.getByRole("textbox", { name: /related keyphrase/i }), {
        target: { value: "trail shoes" },
      });
    });
    await flushAnalyses(); // related analysed

    // The related keyphrase must show its own score (55), not a stuck loader.
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(screen.getAllByText("55").length).toBeGreaterThan(0);
  });
});
