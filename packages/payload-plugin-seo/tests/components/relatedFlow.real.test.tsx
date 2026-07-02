// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalysis } from "../../src/components/SeoDrawer/useAnalysis";
import { KeyphraseTab } from "../../src/components/SeoDrawer/tabs/KeyphraseTab";
import { useKeyphrases } from "../../src/components/SeoDrawer/useKeyphrases";
import { useLiveDocument } from "../../src/components/SeoDrawer/useLiveDocument";

// Real buildAnalysisInput + real runAnalysis; only the Payload/runtime edges are stubbed.
vi.mock("@payloadcms/ui", () => ({
  useAllFormFields: () => [{}],
  useConfig: () => ({ config: { routes: { api: "" } } }),
  useLocale: () => ({ code: "en" }),
  useDebounce: <T,>(value: T) => value,
}));
vi.mock("../../src/content/registry", () => ({
  resolveContentExtractor: () => undefined,
}));
vi.mock("../../src/components/SeoDrawer/languagePacks", () => ({
  ensureLanguagePack: () => Promise.resolve(),
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

beforeEach(() => {
  localStorage.clear();
  // jsdom lacks ResizeObserver, which the metrics visualizations use.
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterEach(() => cleanup());

describe("related keyphrase — real engine flow", () => {
  it("resolves a related keyphrase to metrics after the analysis settles", async () => {
    render(<Harness />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/focus keyphrase/i), {
        target: { value: "running shoes" },
      });
    });
    await act(() => {
      fireEvent.click(screen.getByRole("button", { name: /add related keyphrase/i }));
    });
    await act(async () => {
      fireEvent.change(screen.getByRole("textbox", { name: /related keyphrase/i }), {
        target: { value: "trail shoes" },
      });
    });

    // After the analysis settles the related keyphrase must show its own metrics,
    // not stay stuck on the analyzing loader.
    await waitFor(
      () => {
        expect(screen.queryByText(/analyzing keyphrase/i)).toBeNull();
        expect(screen.getByText(/checks passing/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
