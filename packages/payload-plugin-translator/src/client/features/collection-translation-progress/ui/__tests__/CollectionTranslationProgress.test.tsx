// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DocumentTranslationStatus } from "../../../../entities/translation/model/enums.js";
import type { CollectionTranslationPanel } from "../../../../entities/translation/model/types.js";

import { CollectionTranslationProgress } from "../CollectionTranslationProgress.js";

// `@payloadcms/ui` ships CSS imports Vitest's resolver cannot load, so the two leaves used here are stubbed.
vi.mock("@payloadcms/ui", () => ({ ShimmerEffect: () => null }));
vi.mock("@payloadcms/ui/icons/Trash", () => ({ TrashIcon: () => null }));

const panel = (
  over: Partial<Record<DocumentTranslationStatus, number>> = {}
): CollectionTranslationPanel => ({
  counts: {
    [DocumentTranslationStatus.PENDING]: 0,
    [DocumentTranslationStatus.RUNNING]: 0,
    [DocumentTranslationStatus.COMPLETED]: 0,
    [DocumentTranslationStatus.FAILED]: 0,
    ...over,
  },
  failedWindowMs: 259_200_000,
});

const panelWithWindow = (ms: number): CollectionTranslationPanel => ({
  ...panel({ [DocumentTranslationStatus.FAILED]: 1 }),
  failedWindowMs: ms,
});

const show = (data: CollectionTranslationPanel, canStop = true) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CollectionTranslationProgress
        collection="docs"
        data={data}
        isPending={false}
        canStop={canStop}
      />
    </QueryClientProvider>
  );

describe("the collection progress panel", () => {
  it("offers no row for work that finished", () => {
    show(panel({ [DocumentTranslationStatus.COMPLETED]: 7 }));

    expect(
      screen.queryByText(/translated/iu),
      "a collection-wide total is a statistic nobody acts on; the document's own status answers it"
    ).toBeNull();
  });

  it("still names the work in flight", () => {
    show(panel({ [DocumentTranslationStatus.RUNNING]: 2, [DocumentTranslationStatus.PENDING]: 5 }));

    expect(screen.queryByText(/translating/iu)).not.toBeNull();
    expect(screen.queryByText(/queued/iu)).not.toBeNull();
  });

  it("says how far back the failures it counts go", () => {
    show(panel({ [DocumentTranslationStatus.FAILED]: 4 }));

    expect(
      screen.queryByText(/3 days/iu),
      "without the window the number reads as every failure there has ever been"
    ).not.toBeNull();
  });

  it.each([
    [36 * 60 * 60 * 1000, /1 day 12 hours/iu, "two units, not flattened to the larger one"],
    [24 * 60 * 60 * 1000, /\b1 day\b/iu, "a lone unit is singular"],
    [90 * 60 * 1000, /1 hour 30 minutes/iu, "units smaller than a day are spelled too"],
    [30 * 1000, /under a minute/iu, "a span too short to name still reads as a span"],
  ])("spells a %i ms window in the units it divides into", (ms, phrase, why) => {
    show(panelWithWindow(ms));

    expect(screen.queryByText(phrase), why).not.toBeNull();
  });
  describe("the control for stopping queued work", () => {
    it("is offered when the runner can stop work", () => {
      show(panel({ [DocumentTranslationStatus.PENDING]: 3 }));

      expect(screen.getByLabelText("Cancel translations")).toBeDefined();
    });

    it("is not drawn when the runner cannot, because no route is there to answer it", () => {
      show(panel({ [DocumentTranslationStatus.PENDING]: 3 }), false);

      expect(screen.queryByLabelText("Cancel translations")).toBeNull();
    });

    it("still shows how much is queued when the runner cannot stop it", () => {
      show(panel({ [DocumentTranslationStatus.PENDING]: 3 }), false);

      expect(screen.getByText("3")).toBeDefined();
    });
  });
});
