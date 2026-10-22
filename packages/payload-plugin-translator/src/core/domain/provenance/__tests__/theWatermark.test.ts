import { describe, expect, it, vi } from "vitest";
import type { Field } from "payload";

import { ProvenanceService } from "../../../../server/modules/provenance/Provenance.service.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import { makeIdPath } from "../../content-projection/idPath.js";
import { SkipExistingStrategy } from "../../../translation-pipeline/strategies/index.js";
import type { CurrentFingerprint } from "../staleness.js";
import { changedLeaves, isRecordStale } from "../staleness.js";
import {
  parseSourceFingerprint,
  serializeSourceFingerprint,
  UNANSWERED,
} from "../SourceFingerprint.js";
import type { ProvenanceReceipt, ProvenanceStore } from "../ProvenanceStore.interface.js";
import type { RecordedFingerprints, SourceFingerprint } from "../SourceFingerprint.js";
import { asHash } from "./fixtures/claims.js";

const SHA256_HEX_LENGTH = 64;

const receipt = (over: Partial<ProvenanceReceipt> = {}): ProvenanceReceipt => ({
  collectionSlug: "posts",
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: null,
  translatedAt: "2026-10-22T00:00:00.000Z",
  dismissedFingerprint: null,
  ...over,
});

const sourceNow = (fields: Record<string, string>): CurrentFingerprint => ({
  document: "a".repeat(SHA256_HEX_LENGTH),
  fields: Object.fromEntries(
    Object.entries(fields).map(([address, seed]) => [address, asHash(seed)])
  ),
});

const FILLED_BY_SOMEONE_ELSE = "Von Hand";

describe("a leaf the last run saw and skipped", () => {
  const watermarked = {
    kind: "fields",
    hashes: { title: asHash("ace"), body: asHash("beef") },
  } as const;

  it("is reported as changed once its source moves", () => {
    expect(changedLeaves(watermarked, sourceNow({ title: "ace", body: "cafe" }).fields)).toEqual({
      title: false,
      body: true,
    });
  });

  it("makes the document read out of date, whoever filled the target", () => {
    expect(
      isRecordStale(
        receipt({ sourceFingerprint: watermarked }),
        sourceNow({ title: "ace", body: "cafe" })
      )
    ).toBe(true);
  });

  it("is selected by skip_existing although its target is not empty", () => {
    const changed = changedLeaves(watermarked, sourceNow({ title: "ace", body: "cafe" }).fields);

    expect(
      new SkipExistingStrategy().shouldTranslate({
        sourceValue: "Some prose",
        targetValue: FILLED_BY_SOMEONE_ELSE,
        sourceChanged: changed.body,
      })
    ).toBe(true);
  });

  it("is left alone while its source stands still", () => {
    const changed = changedLeaves(watermarked, sourceNow({ title: "ace", body: "beef" }).fields);

    expect(
      new SkipExistingStrategy().shouldTranslate({
        sourceValue: "Some prose",
        targetValue: FILLED_BY_SOMEONE_ELSE,
        sourceChanged: changed.body,
      })
    ).toBe(false);
  });
});

describe("a receipt written before the watermark", () => {
  const legacy = '{"title":"ace0000000000000","body":null}';

  it("still parses leaf by leaf, so the whole record is not lost", () => {
    expect(parseSourceFingerprint(legacy)?.kind).toBe("fields");
  });

  it("revisits the leaf an old run declined, instead of protecting it for ever", () => {
    const stored = parseSourceFingerprint(legacy);

    expect(changedLeaves(stored, sourceNow({ title: "ace", body: "beef" }).fields).body).toBe(true);
  });

  it("makes that leaf selected by skip_existing over a target it did not write", () => {
    const stored = parseSourceFingerprint(legacy);
    const changed = changedLeaves(stored, sourceNow({ title: "ace", body: "beef" }).fields);

    expect(
      new SkipExistingStrategy().shouldTranslate({
        sourceValue: "Some prose",
        targetValue: FILLED_BY_SOMEONE_ELSE,
        sourceChanged: changed.body,
      })
    ).toBe(true);
  });

  it("carries no legacy value back into the column", () => {
    const stored = parseSourceFingerprint(legacy);
    if (stored === null) throw new TypeError("the legacy receipt must still parse");

    expect(JSON.parse(serializeSourceFingerprint(stored))).toStrictEqual({
      title: asHash("ace"),
      body: UNANSWERED,
    });
  });

  it("makes the document read out of date until a run settles it", () => {
    const stored = parseSourceFingerprint(legacy);

    expect(
      isRecordStale(
        receipt({ sourceFingerprint: stored }),
        sourceNow({ title: "ace", body: "beef" })
      )
    ).toBe(true);
  });
});

describe("the receipt a run leaves behind", () => {
  const COLLECTION = "posts";
  const schema: Field[] = [
    { name: "title", type: "text", localized: true },
    { name: "body", type: "text", localized: true },
  ];

  const NOT_IN_A_TRANSACTION = {};

  const storedAfterRun = async (
    previous: SourceFingerprint | null
  ): Promise<RecordedFingerprints> => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const store: ProvenanceStore = {
      upsert,
      find: vi
        .fn()
        .mockResolvedValue(previous === null ? null : receipt({ sourceFingerprint: previous })),
      findByDocument: vi.fn().mockResolvedValue([]),
      dismiss: vi.fn().mockResolvedValue(undefined),
      deleteByDocument: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ProvenanceService(
      store,
      new Map([[COLLECTION, schema]]) as CollectionSchemaMap,
      NOT_IN_A_TRANSACTION,
      { logger: { error: vi.fn() }, readSource: vi.fn() }
    );

    await service.record(
      { collectionSlug: COLLECTION, documentId: "1", targetLocale: "de", sourceLocale: "en" },
      sourceNow({ title: "ace", body: "beef" }).fields,
      [{ idPath: makeIdPath([{ kind: "key", name: "title" }]), answeredInFull: true }]
    );

    const written = upsert.mock.calls[0]?.[0] as {
      sourceFingerprint: { hashes: RecordedFingerprints };
    };
    return written.sourceFingerprint.hashes;
  };

  it("records where the source stands for a leaf it did not send", async () => {
    expect(await storedAfterRun(null)).toEqual({ title: asHash("ace"), body: asHash("beef") });
  });

  it("brings that leaf back on the next run once its source moves", async () => {
    const stored = await storedAfterRun(null);

    expect(
      changedLeaves(
        { kind: "fields", hashes: stored },
        sourceNow({ title: "ace", body: "cafe" }).fields
      )
    ).toEqual({ title: false, body: true });
  });

  it("keeps an older decline marked for revisiting until a run answers it", async () => {
    const stored = await storedAfterRun(
      parseSourceFingerprint('{"title":"ace0000000000000","body":null}')
    );

    expect(stored.body).toBe(UNANSWERED);
  });
});
