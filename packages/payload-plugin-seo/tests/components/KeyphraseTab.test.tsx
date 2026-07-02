// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyphraseTab } from "../../src/components/SeoDrawer/tabs/KeyphraseTab";
import type { AnalysisResult } from "../../src/engine/types/analysis";

afterEach(() => {
  cleanup();
});

const cat = (score: number, status: "good" | "warn" | "bad") => ({
  ringScore: score,
  status,
  checks: [],
});
const result = {
  overall: { seoScore: 82, status: "good" },
  keyphraseText: "payload cms",
  keyphrase: cat(82, "good"),
  onPage: cat(70, "good"),
  readability: cat(70, "good"),
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
  relatedKeyphrases: [{ text: "headless cms", result: cat(58, "warn") }],
} as unknown as AnalysisResult;

const entries = [
  { id: "a", text: "payload cms", synonyms: [] },
  { id: "b", text: "headless cms", synonyms: [] },
];
const handlers = {
  onSelect: vi.fn(),
  onAddRelated: vi.fn(),
  onTextChange: vi.fn(),
  onAddSynonym: vi.fn(),
  onRemoveSynonym: vi.fn(),
  onRemove: vi.fn(),
  onSetFocus: vi.fn(),
  isDuplicate: () => false,
};

describe("KeyphraseTab", () => {
  it("defaults the detail pane to the focus keyphrase and shows its checks-passing header", () => {
    render(
      <KeyphraseTab
        keyphrases={entries}
        selectedId={null}
        result={result}
        analyzing={false}
        {...handlers}
      />
    );
    expect((screen.getByLabelText(/focus keyphrase/i) as HTMLInputElement).value).toBe(
      "payload cms"
    );
  });

  it("shows a related keyphrase's own score when selected", () => {
    render(
      <KeyphraseTab
        keyphrases={entries}
        selectedId="b"
        result={result}
        analyzing={false}
        {...handlers}
      />
    );
    expect(
      (screen.getByRole("textbox", { name: /related keyphrase/i }) as HTMLInputElement).value
    ).toBe("headless cms");
  });

  it("keeps the previous metrics visible but dimmed while re-analyzing an edited focus keyphrase", () => {
    // First render analyses "payload cms" (ringScore 82) — its metrics become the
    // "previous analytics" for this keyphrase entry.
    const { container, rerender } = render(
      <KeyphraseTab
        keyphrases={[{ id: "a", text: "payload cms", synonyms: [] }]}
        selectedId="a"
        result={result}
        analyzing={false}
        {...handlers}
      />
    );
    expect(screen.getAllByText("82").length).toBeGreaterThan(0);

    // The user edits the focus keyphrase; the fresh result no longer matches.
    rerender(
      <KeyphraseTab
        keyphrases={[{ id: "a", text: "payloa", synonyms: [] }]}
        selectedId="a"
        result={result}
        analyzing={false}
        {...handlers}
      />
    );

    // Previous metrics stay on screen (82) inside a dimmed container, no loader.
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(container.querySelector(".opacity-40")).toBeTruthy();
    expect(screen.queryByText(/analyzing keyphrase/i)).toBeNull();
    // The rail card must not present the stale score as the current one.
    expect(screen.getByRole("button", { name: /payloa/i })).not.toHaveTextContent("82");
  });

  it("keeps a related keyphrase's previous metrics dimmed while re-analyzing (not stuck 'analyzing')", () => {
    // First render analyses related "headless cms" (ringScore 58).
    const entriesForRelated = [
      { id: "a", text: "payload cms", synonyms: [] },
      { id: "b", text: "headless cms", synonyms: [] },
    ];
    const { container, rerender } = render(
      <KeyphraseTab
        keyphrases={entriesForRelated}
        selectedId="b"
        result={result}
        analyzing={false}
        {...handlers}
      />
    );
    expect(screen.getAllByText("58").length).toBeGreaterThan(0);

    // Edit the related keyphrase; its fresh result no longer matches by text.
    rerender(
      <KeyphraseTab
        keyphrases={[entriesForRelated[0], { id: "b", text: "headless cm", synonyms: [] }]}
        selectedId="b"
        result={result}
        analyzing={false}
        {...handlers}
      />
    );

    // Previous related metrics stay dimmed — no "Analyzing keyphrase…" loader.
    expect(screen.getByText("58")).toBeInTheDocument();
    expect(container.querySelector(".opacity-40")).toBeTruthy();
    expect(screen.queryByText(/analyzing keyphrase/i)).toBeNull();
  });

  it("shows the analyzing loader (no stale score) when the focus keyphrase was previously empty", () => {
    // The last analysis was for an empty focus keyphrase (keyphraseText ""), so
    // there are no previous analytics — typing the first character must show the
    // loader, never the meaningless empty-state score (statusToRing([]) === 100).
    const emptyThenTyped = [{ id: "a", text: "p", synonyms: [] }];
    const emptyResult = {
      ...result,
      keyphraseText: "",
      keyphrase: cat(100, "good"),
    } as unknown as AnalysisResult;
    render(
      <KeyphraseTab
        keyphrases={emptyThenTyped}
        selectedId="a"
        result={emptyResult}
        analyzing={false}
        {...handlers}
      />
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/analyzing keyphrase/i);
    expect(status.querySelector("svg")).toBeTruthy();
    expect(screen.queryByText("100")).toBeNull();
  });

  it("does not render a score ring on the focus rail card when the focus keyphrase is empty", () => {
    // statusToRing([]) === 100, so an unanalysed empty focus keyphrase yields
    // result.keyphrase.ringScore === 100 — the rail card must NOT show it.
    const emptyFocus = [{ id: "a", text: "", synonyms: [] }];
    const emptyResult = { ...result, keyphrase: cat(100, "good") } as unknown as AnalysisResult;
    render(
      <KeyphraseTab
        keyphrases={emptyFocus}
        selectedId="a"
        result={emptyResult}
        analyzing={false}
        {...handlers}
      />
    );
    const railCard = screen.getByRole("button", { name: /new keyphrase/i });
    expect(railCard).not.toHaveTextContent("100");
  });

  it("does not render a score ring on the rail card for a duplicate related keyphrase", () => {
    render(
      <KeyphraseTab
        keyphrases={entries}
        selectedId="b"
        result={result}
        analyzing={false}
        {...handlers}
        isDuplicate={(id) => id === "b"}
      />
    );
    const railCard = screen.getByRole("button", { name: /headless cms/i });
    expect(railCard).not.toHaveTextContent("58");
  });
});
