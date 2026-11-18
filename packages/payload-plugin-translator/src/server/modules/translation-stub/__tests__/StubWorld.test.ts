import { describe, expect, it } from "vitest";

import type { ContentState, LocaleState } from "../../../../types/wire/DocumentTranslationState.js";
import { StubWorld } from "../model/StubWorld.js";
import type { DocumentSeed, WorldRules } from "../model/StubWorld.js";
import { FIXTURE_DOCUMENT } from "../scenarios/fixtureDocument.js";

const NOW = "2026-11-13T12:00:00.000Z";
const LOCALES = { source: "en", targets: ["de", "fr"] };
const POST = { collection: "posts", id: "1" };

const quiet: DocumentSeed = {
  contents: { de: { kind: "empty" }, fr: { kind: "empty" } },
  run: null,
};

const worldOf = (over: Partial<WorldRules> = {}, seed: DocumentSeed = quiet): StubWorld =>
  new StubWorld(
    {
      fixture: FIXTURE_DOCUMENT,
      seed: () => seed,
      runsFail: false,
      keepsRecords: true,
      ...over,
    },
    () => NOW
  );

const localeOf = (world: StubWorld, locale: string): LocaleState => {
  const found = world.documentState(POST, LOCALES).locales.find((l) => l.locale === locale);
  if (!found) throw new Error(`no ${locale} in the answer`);
  return found;
};

const statusesOf = (world: StubWorld): Array<string | null> =>
  world.documentState(POST, LOCALES).locales.map((l) => l.run?.status ?? null);

describe("admission", () => {
  it("queues one run covering every asked locale, one assignment per locale", () => {
    const world = worldOf();

    const outcome = world.enqueue("posts", ["1"], ["de", "fr"], LOCALES);

    expect(outcome.queued).toBe(2);
    expect(outcome.busy).toEqual([]);
    expect(outcome.assignments.map((a) => a.target_lng)).toEqual(["de", "fr"]);
  });

  it("answers a document with a live run as busy and queues nothing for it", () => {
    const world = worldOf();
    world.enqueue("posts", ["1"], ["de"], LOCALES);

    const second = world.enqueue("posts", ["1", "2"], ["fr"], LOCALES);

    expect(second.busy).toEqual(["1"]);
    expect(second.queued).toBe(1);
    expect(second.assignments.map((a) => a.collection_id)).toEqual(["2"]);
    expect(localeOf(world, "fr").run).toBeNull();
  });

  it("cancel removes the whole run, every locale it covered", () => {
    const world = worldOf();
    world.enqueue("posts", ["1"], ["de", "fr"], LOCALES);

    world.cancel([POST]);

    expect(statusesOf(world)).toEqual([null, null]);
    expect(world.enqueue("posts", ["1"], ["de"], LOCALES).busy).toEqual([]);
  });

  it("cancel by collection removes the collection's live runs only", () => {
    const world = worldOf();
    world.enqueue("posts", ["1"], ["de"], LOCALES);
    world.enqueue("pages", ["1"], ["de"], LOCALES);

    world.cancelCollection("posts");

    expect(world.enqueue("posts", ["1"], ["de"], LOCALES).busy).toEqual([]);
    expect(world.enqueue("pages", ["1"], ["de"], LOCALES).busy).toEqual(["1"]);
  });

  it("runs a queued run now, refuses a running one, and knows no run for an untouched document", () => {
    const world = worldOf();
    world.enqueue("posts", ["1"], ["de"], LOCALES);

    expect(world.runNow(POST)).toBe("started");
    expect(world.runNow(POST)).toBe("already-running");
    expect(world.runNow({ collection: "posts", id: "nobody" })).toBe("unknown");
  });

  it("re-runs a failed run", () => {
    const world = worldOf({ runsFail: true });
    world.enqueue("posts", ["1"], ["de"], LOCALES);
    world.documentState(POST, LOCALES);
    world.documentState(POST, LOCALES);
    expect(localeOf(world, "de").run?.status).toBe("failed");

    expect(world.runNow(POST)).toBe("started");
    expect(localeOf(world, "de").run?.status).toBe("running");
  });
});

describe("progress", () => {
  it("each read answers, then moves the run one step: queued, running, done", () => {
    const world = worldOf();
    world.enqueue("posts", ["1"], ["de", "fr"], LOCALES);

    expect(statusesOf(world)).toEqual(["queued", "queued"]);
    expect(statusesOf(world)).toEqual(["running", "running"]);
    expect(statusesOf(world)).toEqual([null, null]);
  });

  it("leaves the covered locales tracked, every leaf current, translated now", () => {
    const world = worldOf();
    world.enqueue("posts", ["1"], ["de"], LOCALES);
    world.documentState(POST, LOCALES);
    world.documentState(POST, LOCALES);

    const de = localeOf(world, "de").content;
    expect(de.kind).toBe("tracked");
    if (de.kind !== "tracked") return;
    expect(de.translatedAt).toBe(NOW);
    expect(de.dismissed).toBe(false);
    expect(new Set(Object.values(de.verdicts))).toEqual(new Set(["current"]));
    expect(Object.keys(de.verdicts)).toContain("sidebar.s2.text");
    expect(localeOf(world, "fr").content).toEqual({ kind: "empty" });
  });

  it("leaves filled, with no verdicts, where no records are kept", () => {
    const world = worldOf({ keepsRecords: false });
    world.enqueue("posts", ["1"], ["de"], LOCALES);
    world.documentState(POST, LOCALES);
    world.documentState(POST, LOCALES);

    expect(localeOf(world, "de").content).toEqual({ kind: "filled" });
  });

  it("fails the run on its first locale and leaves the rest not started when runs fail", () => {
    const world = worldOf({ runsFail: true });
    world.enqueue("posts", ["1"], ["de", "fr"], LOCALES);
    world.documentState(POST, LOCALES);
    world.documentState(POST, LOCALES);

    expect(localeOf(world, "de").run).toMatchObject({ status: "failed", locales: ["de", "fr"] });
    expect(localeOf(world, "fr").run).toMatchObject({ status: "not-started", failedLocale: "de" });
    expect(localeOf(world, "de").content).toEqual({ kind: "empty" });
  });

  it("a failed run no longer blocks, and a new run over its locales supersedes it", () => {
    const world = worldOf({ runsFail: true });
    world.enqueue("posts", ["1"], ["de"], LOCALES);
    world.documentState(POST, LOCALES);
    world.documentState(POST, LOCALES);

    expect(world.enqueue("posts", ["1"], ["de"], LOCALES).busy).toEqual([]);
    expect(localeOf(world, "de").run?.status).toBe("queued");
  });

  it("a list read moves runs too, and reports a locale only as empty or filled", () => {
    const world = worldOf();
    world.enqueue("posts", ["1"], ["de"], LOCALES);

    const first = world.listState("posts", ["1"], LOCALES).docs[0];
    world.listState("posts", ["1"], LOCALES);
    const done = world.listState("posts", ["1"], LOCALES).docs[0];

    expect(first.locales[0]).toMatchObject({ locale: "de", run: { status: "queued" } });
    expect(done.locales[0]).toEqual({
      locale: "de",
      content: { kind: "filled", translatedAt: NOW },
      run: null,
    });
  });
});

describe("what a document reports", () => {
  const seeded = (contents: Record<string, ContentState>): StubWorld =>
    worldOf({}, { contents, run: null });

  it("never reports untracked content as empty", () => {
    const world = seeded({ de: { kind: "untracked" }, fr: { kind: "empty" } });

    expect(localeOf(world, "de").content).toEqual({ kind: "untracked" });
    expect(world.listState("posts", ["1"], LOCALES).docs[0].locales[0].content).toEqual({
      kind: "filled",
      translatedAt: null,
    });
  });

  it("asks an empty locale for its required leaves, and nothing of a filled one", () => {
    const world = seeded({ de: { kind: "empty" }, fr: { kind: "untracked" } });

    expect(localeOf(world, "de").mustInclude).toEqual(["title"]);
    expect(localeOf(world, "fr").mustInclude).toEqual([]);
  });

  it("answers the source locale, the fixture tree and the excluded labels", () => {
    const state = worldOf().documentState(POST, LOCALES);

    expect(state).toMatchObject({ collection: "posts", id: "1", sourceLocale: "en" });
    expect(state.tree).toEqual(FIXTURE_DOCUMENT.tree);
    expect(state.excluded).toEqual(["Slug"]);
    expect(state.locales.map((l) => l.locale)).toEqual(["de", "fr"]);
  });

  it("dismisses a tracked locale's drift", () => {
    const world = seeded({
      de: {
        kind: "tracked",
        verdicts: { summary: "drifted" },
        translatedAt: NOW,
        dismissed: false,
      },
      fr: { kind: "empty" },
    });

    world.dismiss(POST, "de", LOCALES);

    expect(localeOf(world, "de").content).toMatchObject({ kind: "tracked", dismissed: true });
  });

  it("shows a seeded run the actions reach by its document", () => {
    const world = worldOf({}, { ...quiet, run: { status: "queued", locales: ["de", "fr"] } });

    if (!localeOf(world, "de").run) throw new Error("the seeded run must show");
    world.cancel([POST]);

    expect(statusesOf(world)).toEqual([null, null]);
  });
});
