import { afterEach, describe, expect, it, vi } from "vitest";

import { AnyAccessGuard } from "../../../../server/shared/access/AnyAccessGuard.js";
import type { AccessGuard } from "../../../../types/AccessGuard.js";
import { REQUEST_TIMEOUT_MS, createRequest } from "../../../shared/api/createRequest.js";
import { ApiRequestError } from "../../../shared/api/errors/ApiRequestError.js";
import {
  FIELD_TRANSLATION_TIMEOUT_MS,
  HttpTranslationRepository,
} from "../api/HttpTranslationRepository.js";
import { inProcessFetch } from "./inProcessFetch.fixture.js";
import { describeTranslationRepositoryContract } from "./TranslationRepository.contract.js";

const LOCALES = { source: "en", targets: ["de", "fr"] };
const DOCUMENTS = [
  { collection: "pages", id: "1" },
  { collection: "pages", id: "2" },
];

const overStub = (access: AccessGuard = new AnyAccessGuard()) => {
  const { fetch, baseURL } = inProcessFetch({ documents: DOCUMENTS, locales: LOCALES, access });
  return new HttpTranslationRepository(createRequest({ baseURL, fetch }));
};

/** Never answers; rejects with the abort reason when the signal fires, as a browser fetch does. */
const hanging: typeof globalThis.fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

const refusalOf = (pending: Promise<unknown>): Promise<unknown> =>
  pending.then(() => null).catch((error: unknown) => error);

describeTranslationRepositoryContract("http over the stub's handlers", () => ({
  repository: overStub(),
  locales: LOCALES,
}));

describe("HttpTranslationRepository", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a read as forbidden when the guard refuses", async () => {
    const refusing: AccessGuard = { check: async () => false };

    const refusal = await refusalOf(
      overStub(refusing).getDocumentState({ collection: "pages", id: "1" })
    );

    expect(refusal).toBeInstanceOf(ApiRequestError);
    expect(refusal).toMatchObject({ reason: "forbidden", status: 403 });
  });

  it("answers a cancel the server took whole as nothing refused", async () => {
    const repository = overStub();
    await repository.enqueue({
      source_lng: "en",
      target_lng: ["de"],
      collection_slug: "pages",
      collection_id: ["1"],
    });
    expect(await repository.cancel({ collection: "pages", id: "1" })).toEqual({ refused: [] });
  });

  it("rejects running a run that is already running as busy, and a document with no run as not found", async () => {
    const repository = overStub();
    await repository.enqueue({
      source_lng: "en",
      target_lng: ["de"],
      collection_slug: "pages",
      collection_id: ["1"],
    });
    const document = { collection: "pages", id: "1" };
    await repository.runNow(document);

    expect(await refusalOf(repository.runNow(document))).toMatchObject({ reason: "busy" });
    expect(await refusalOf(repository.runNow({ collection: "pages", id: "nobody" }))).toMatchObject(
      { reason: "not-found" }
    );
  });

  it("waits longer for a field translation than for any other request", async () => {
    vi.useFakeTimers();
    const repository = new HttpTranslationRepository(
      createRequest({ baseURL: "/api/translate", fetch: hanging })
    );
    let settled = false;
    const pending = refusalOf(
      repository.translateField({
        collection_slug: "pages",
        field_path: "title",
        source_lng: "en",
        target_lng: "de",
        doc_id: "1",
      })
    ).finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(FIELD_TRANSLATION_TIMEOUT_MS - REQUEST_TIMEOUT_MS);

    expect(await pending).toMatchObject({ reason: "timeout" });
  });
});
