import { describe, expect, it } from "vitest";

import type { LocaleState } from "../../../../types/wire/DocumentTranslationState.js";
import type { DocumentId, LocaleCode } from "../../../../types/wire/primitives.js";
import type { RunState } from "../../../../types/wire/RunState.js";
import { ApiRequestError } from "../../../shared/api/errors/ApiRequestError.js";
import type { TranslationRepository } from "../model/TranslationRepository.js";

export type ContractLocales = { source: LocaleCode; targets: readonly LocaleCode[] };

/**
 * A fresh repository whose server holds the documents `"1"` and `"2"` of the collection `"pages"`,
 * every target locale empty and no run, and nothing else. At least two target locales.
 */
export type ContractBinding = { repository: TranslationRepository; locales: ContractLocales };

const COLLECTION = "pages";
const KNOWN: readonly [DocumentId, DocumentId] = ["1", "2"];
const UNKNOWN: DocumentId = "never-created";

const runsByLocale = (locales: readonly LocaleState[]): Record<LocaleCode, RunState | null> =>
  Object.fromEntries(locales.map(({ locale, run }) => [locale, run]));

/** Invariants that hold on any server in that setup, so the suite binds to the real one too. */
export function describeTranslationRepositoryContract(
  name: string,
  create: () => ContractBinding | Promise<ContractBinding>
): void {
  const setUp = async () => {
    const binding = await create();
    const [first, second] = binding.locales.targets;
    if (first === undefined || second === undefined) {
      throw new Error(`${name}: the contract needs at least two target locales`);
    }
    return { ...binding, first, second };
  };

  const read = (repository: TranslationRepository, id: DocumentId) =>
    repository.getDocumentState({ collection: COLLECTION, id });

  describe(`TranslationRepository contract: ${name}`, () => {
    it("reads a fresh document with every target locale empty and no run", async () => {
      const { repository, locales } = await setUp();

      const state = await read(repository, KNOWN[0]);

      expect(state.locales.map(({ locale }) => locale)).toEqual(locales.targets);
      for (const locale of state.locales) {
        expect(locale.content).toEqual({ kind: "empty" });
        expect(locale.run).toBeNull();
      }
    });

    it("shows an enqueued run on exactly the requested locales of that document only", async () => {
      const { repository, locales, first } = await setUp();

      await repository.enqueue({
        source_lng: locales.source,
        target_lng: [first],
        collection_slug: COLLECTION,
        collection_id: [KNOWN[0]],
      });

      const runs = runsByLocale((await read(repository, KNOWN[0])).locales);
      for (const locale of locales.targets) {
        if (locale === first) {
          expect(runs[locale]?.locales).toEqual([first]);
          expect(["queued", "running"]).toContain(runs[locale]?.status);
        } else {
          expect(runs[locale]).toBeNull();
        }
      }
      const other = runsByLocale((await read(repository, KNOWN[1])).locales);
      expect(Object.values(other)).toEqual(locales.targets.map(() => null));
    });

    it("rejects a second enqueue for a document with a live run as busy and keeps the run", async () => {
      const { repository, locales, first, second } = await setUp();
      const enqueueInto = (target: LocaleCode) =>
        repository.enqueue({
          source_lng: locales.source,
          target_lng: [target],
          collection_slug: COLLECTION,
          collection_id: [KNOWN[0]],
        });
      await enqueueInto(first);
      const before = runsByLocale((await read(repository, KNOWN[0])).locales);

      const refusal = await enqueueInto(second).then(
        () => null,
        (error: unknown) => error
      );

      expect(refusal).toBeInstanceOf(ApiRequestError);
      expect(refusal).toMatchObject({ reason: "busy" });
      const after = runsByLocale((await read(repository, KNOWN[0])).locales);
      expect(after[first]?.handle).toBe(before[first]?.handle);
      expect(after[first]?.locales).toEqual([first]);
      expect(after[second]).toBeNull();
    });

    it("cancels a run on every locale it covered", async () => {
      const { repository, locales, first, second } = await setUp();
      await repository.enqueue({
        source_lng: locales.source,
        target_lng: [first, second],
        collection_slug: COLLECTION,
        collection_id: [KNOWN[0]],
      });
      const handle = runsByLocale((await read(repository, KNOWN[0])).locales)[first]?.handle;
      if (handle === undefined) throw new Error("the enqueued run is not visible to a read");

      await repository.cancel([handle]);

      const runs = runsByLocale((await read(repository, KNOWN[0])).locales);
      expect(runs[first]).toBeNull();
      expect(runs[second]).toBeNull();
    });

    it("lists one entry per requested known id and leaves out an unknown one", async () => {
      const { repository } = await setUp();

      const list = await repository.getListState({
        collection: COLLECTION,
        ids: [KNOWN[0], UNKNOWN, KNOWN[1]],
      });

      const ids = list.docs.map(({ id }) => id);
      expect(ids).toHaveLength(KNOWN.length);
      expect(ids).toEqual(expect.arrayContaining([...KNOWN]));
    });

    it("rejects a field translation of a missing document as not found", async () => {
      const { repository, locales, first } = await setUp();

      const refusal = await repository
        .translateField({
          collection_slug: COLLECTION,
          field_path: "title",
          source_lng: locales.source,
          target_lng: first,
          doc_id: UNKNOWN,
        })
        .then(
          () => null,
          (error: unknown) => error
        );

      expect(refusal).toBeInstanceOf(ApiRequestError);
      expect(refusal).toMatchObject({ reason: "not-found" });
    });
  });
}
