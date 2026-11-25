import type {
  ContentState,
  DocumentTranslationState,
  LeafVerdict,
  LocaleState,
  TreeNode,
} from "../../../../../../types/wire/DocumentTranslationState.js";
import type { EnqueueAssignmentBody } from "../../../../../../types/wire/ActionBodies.js";
import type {
  ListLocaleState,
  ListTranslationState,
} from "../../../../../../types/wire/ListTranslationState.js";
import type {
  DocumentId,
  IsoDateTime,
  LeafAddress,
  LocaleCode,
} from "../../../../../../types/wire/primitives.js";
import type { RunState } from "../../../../../../types/wire/RunState.js";

import { leavesOf } from "./leavesOf.js";

export type DocumentRef = { collection: string; id: DocumentId };

/** The host's locales as one document sees them. */
export type WorldLocales = { source: LocaleCode; targets: readonly LocaleCode[] };

export type SeededRun = { status: "queued" | "running" | "failed"; locales: readonly LocaleCode[] };

/** What a document holds the first time anyone asks about it. */
export type DocumentSeed = {
  contents: Readonly<Record<LocaleCode, ContentState>>;
  run: SeededRun | null;
};

export type StubFixture = { tree: readonly TreeNode[]; excluded: readonly string[] };

export type WorldRules = {
  fixture: StubFixture;
  seed: (document: DocumentRef, targets: readonly LocaleCode[]) => DocumentSeed;
  runsFail: boolean;
  /** Off: a finished run leaves `filled`, as an installation without provenance would. */
  keepsRecords: boolean;
};

export type EnqueueOutcome = {
  queued: number;
  busy: DocumentId[];
  assignments: EnqueueAssignmentBody[];
};

export type RunNowOutcome = "started" | "already-running" | "unknown";

type DocumentKey = string;

/** The stub's own name for a run; it never leaves the stub. */
type RunHandle = string;

type Run = {
  handle: RunHandle;
  collection: string;
  document: DocumentKey;
  /** The locale the run translates from, which its finished locales are judged against. */
  source: LocaleCode;
  locales: readonly LocaleCode[];
  queuedAt: IsoDateTime;
  status: SeededRun["status"];
};

const FAILURE_MESSAGE = "The stub's scenario fails every run.";

const keyOf = ({ collection, id }: DocumentRef): DocumentKey => `${collection}:${id}`;

const isLive = (run: Run): boolean => run.status === "queued" || run.status === "running";

function runStateFor(run: Run, locale: LocaleCode): RunState {
  const { locales, queuedAt } = run;
  if (run.status !== "failed") return { status: run.status, locales, queuedAt };

  const [failedLocale] = locales;
  if (locale === failedLocale) {
    return { status: "failed", locales, queuedAt, message: FAILURE_MESSAGE };
  }
  return { status: "not-started", locales, queuedAt, failedLocale };
}

function listContentOf(content: ContentState): ListLocaleState["content"] {
  if (content.kind === "empty") return { kind: "empty" };
  if (content.kind === "tracked") return { kind: "filled", translatedAt: content.translatedAt };
  return { kind: "filled", translatedAt: null };
}

/**
 * The stub's whole state: every document's locales and every run, in memory. Each read of a
 * document answers first, then moves its live runs one step, so every state is seen once.
 */
export class StubWorld {
  private readonly rules: WorldRules;
  private readonly now: () => IsoDateTime;
  private readonly contents = new Map<DocumentKey, Map<LocaleCode, ContentState>>();
  /** In admission order: the last run covering a locale is the one it reports. */
  private readonly runs = new Map<RunHandle, Run>();
  private nextHandle = 1;

  constructor(rules: WorldRules, now: () => IsoDateTime = () => new Date().toISOString()) {
    this.rules = rules;
    this.now = now;
  }

  documentState(document: DocumentRef, locales: WorldLocales): DocumentTranslationState {
    const state: DocumentTranslationState = {
      collection: document.collection,
      id: document.id,
      sourceLocale: locales.source,
      tree: this.rules.fixture.tree,
      excluded: this.rules.fixture.excluded,
      locales: this.localeStates(document, locales),
    };
    this.advance(keyOf(document));
    return state;
  }

  listState(
    collection: string,
    ids: readonly DocumentId[],
    locales: WorldLocales
  ): ListTranslationState {
    const docs = ids.map((id) => {
      const document = { collection, id };
      const row = {
        id,
        locales: this.localeStates(document, locales).map(
          ({ locale, content, run }): ListLocaleState => ({
            locale,
            content: listContentOf(content),
            run,
          })
        ),
      };
      this.advance(keyOf(document));
      return row;
    });
    return { collection, docs };
  }

  enqueue(
    collection: string,
    ids: readonly DocumentId[],
    runTargets: readonly LocaleCode[],
    locales: WorldLocales
  ): EnqueueOutcome {
    const outcome: EnqueueOutcome = { queued: 0, busy: [], assignments: [] };
    for (const id of ids) {
      const document = { collection, id };
      const key = this.touched(document, locales);
      if (this.runsOf(key).some(isLive)) {
        outcome.busy.push(id);
        continue;
      }

      this.supersedeFailures(key, runTargets);
      const run = this.admit(document, locales.source, { status: "queued", locales: runTargets });
      outcome.queued += runTargets.length;
      outcome.assignments.push(
        ...runTargets.map((target) => ({
          collection_slug: collection,
          collection_id: id,
          target_lng: target,
        }))
      );
    }
    return outcome;
  }

  /** Removes each document's live run, on every locale it covers. */
  cancel(documents: readonly DocumentRef[]): void {
    for (const document of documents) {
      for (const run of this.runsOf(keyOf(document))) {
        if (isLive(run)) this.runs.delete(run.handle);
      }
    }
  }

  cancelCollection(collection: string): void {
    for (const run of [...this.runs.values()]) {
      if (isLive(run) && run.collection === collection) this.runs.delete(run.handle);
    }
  }

  /** Starts the document's latest run; a failed one starts again, as Retry. */
  runNow(document: DocumentRef): RunNowOutcome {
    const run = this.runsOf(keyOf(document)).at(-1);
    if (!run) return "unknown";
    if (run.status === "running") return "already-running";
    run.status = "running";
    return "started";
  }

  /**
   * Modelled as a rebase onto the current source with no flag kept — as the real dismissal is.
   */
  dismiss(document: DocumentRef, locale: LocaleCode, locales: WorldLocales): void {
    const contents = this.contents.get(this.touched(document, locales));
    const content = contents?.get(locale);
    if (!contents || content?.kind !== "tracked") return;
    const rebased = Object.fromEntries(
      Object.keys(content.verdicts).map((leaf): [LeafAddress, LeafVerdict] => [leaf, "current"])
    );
    contents.set(locale, { ...content, verdicts: rebased });
  }

  private localeStates(document: DocumentRef, locales: WorldLocales): LocaleState[] {
    const key = this.touched(document, locales);
    const contents = this.contents.get(key);
    const runs = this.runsOf(key);

    return locales.targets.map((locale) => {
      const content = contents?.get(locale) ?? { kind: "empty" };
      const run = [...runs].reverse().find((candidate) => candidate.locales.includes(locale));
      return {
        locale,
        content,
        run: run ? runStateFor(run, locale) : null,
      };
    });
  }

  /** Seeds a document the first time anything asks about it. */
  private touched(document: DocumentRef, locales: WorldLocales): DocumentKey {
    const key = keyOf(document);
    if (this.contents.has(key)) return key;

    const seed = this.rules.seed(document, locales.targets);
    this.contents.set(key, new Map(Object.entries(seed.contents)));
    if (seed.run) this.admit(document, locales.source, seed.run);
    return key;
  }

  private admit(document: DocumentRef, source: LocaleCode, seeded: SeededRun): Run {
    const run: Run = {
      handle: `stub-run-${this.nextHandle}`,
      collection: document.collection,
      document: keyOf(document),
      source,
      locales: seeded.locales,
      queuedAt: this.now(),
      status: seeded.status,
    };
    this.nextHandle += 1;
    this.runs.set(run.handle, run);
    return run;
  }

  private runsOf(document: DocumentKey): Run[] {
    return [...this.runs.values()].filter((run) => run.document === document);
  }

  private supersedeFailures(document: DocumentKey, targets: readonly LocaleCode[]): void {
    for (const run of this.runsOf(document)) {
      if (run.status === "failed" && run.locales.some((locale) => targets.includes(locale))) {
        this.runs.delete(run.handle);
      }
    }
  }

  private advance(document: DocumentKey): void {
    for (const run of this.runsOf(document)) {
      if (run.status === "queued") run.status = "running";
      else if (run.status === "running") this.finish(run);
    }
  }

  private finish(run: Run): void {
    if (this.rules.runsFail) {
      run.status = "failed";
      return;
    }

    this.runs.delete(run.handle);
    const contents = this.contents.get(run.document);
    for (const locale of run.locales) contents?.set(locale, this.translated(run.source));
  }

  private translated(source: LocaleCode): ContentState {
    if (!this.rules.keepsRecords) return { kind: "filled" };
    const verdicts = Object.fromEntries(
      leavesOf(this.rules.fixture.tree).map((leaf): [LeafAddress, LeafVerdict] => [leaf, "current"])
    );
    return { kind: "tracked", verdicts, translatedAt: this.now(), sourceLocale: source };
  }
}
