import { getPayload } from "payload";

import config from "../src/payload.config";

// Cross-DB verification of translation provenance against the active DB adapter (DB_ADAPTER).
// Run per adapter via the package scripts (verify:provenance:{sqlite,postgres,mongo}) or all at once
// with verify:provenance:all. See docs/multi-db-verification.md.
// Exercises the sidecar collection + afterDelete cleanup directly via the local API (no OpenAI call).

const ADAPTER = process.env.DB_ADAPTER ?? "sqlite";
const SLUG = "translator-provenance";
const ok = (m: string) => console.log(`  ✓ ${m}`);
const fail = (m: string) => {
  console.error(`  ✗ ${m}`);
  process.exitCode = 1;
};

console.log(`\n── provenance verify · adapter=${ADAPTER} ──`);
const payload = await getPayload({ config });

// 1. The sidecar collection is registered and its table/collection exists.
try {
  await payload.find({ collection: SLUG, limit: 1 });
  ok("translator-provenance is queryable (schema present)");
} catch (e) {
  fail(`not queryable: ${(e as Error).message}`);
  process.exit(1);
}

// 2. dismissedFingerprint: null round-trips (the deferred cross-DB null check).
const created = await payload.create({
  collection: SLUG,
  data: {
    collectionSlug: "pages",
    documentId: "verify-doc-1",
    targetLocale: "de",
    sourceLocale: "en",
    sourceFingerprint: "fp-verify",
    translatedAt: new Date().toISOString(),
    dismissedFingerprint: null,
  },
});
const reread = await payload.findByID({ collection: SLUG, id: created.id });
if (reread.dismissedFingerprint === null) ok("dismissedFingerprint: null round-trips");
else fail(`dismissedFingerprint expected null, got ${JSON.stringify(reread.dismissedFingerprint)}`);
if (reread.sourceFingerprint === "fp-verify" && reread.targetLocale === "de")
  ok("other fields round-trip");
else fail("field round-trip mismatch");

// 3. Composite key (collectionSlug, documentId, targetLocale) uniqueness. Hard check on SQL; on Mongo
// it's informational — mongoose builds unique indexes in the background, so a rapid second insert can
// slip through before the index is live. The plugin's upsert() doesn't rely on the DB constraint
// anyway (it matches by find-first), so this is a backstop, not the guarantee.
let duplicateAllowed = false;
try {
  await payload.create({
    collection: SLUG,
    data: {
      collectionSlug: "pages",
      documentId: "verify-doc-1",
      targetLocale: "de",
      sourceLocale: "en",
      sourceFingerprint: "fp-dup",
      translatedAt: new Date().toISOString(),
      dismissedFingerprint: null,
    },
  });
  duplicateAllowed = true;
} catch {
  /* rejected by the unique index — expected on SQL */
}
if (!duplicateAllowed) ok("composite unique rejects a duplicate key");
else if (ADAPTER === "mongo")
  console.log(
    "  ⚠ duplicate allowed (Mongo builds unique indexes in background; upsert guards via find-first)"
  );
else fail("duplicate key was allowed — composite unique NOT enforced");

// 4. deleteByDocument semantics: a single delete keyed on (collectionSlug, documentId) clears the
// document's rows across ALL target locales. This is exactly what the afterDelete cleanup hook calls,
// tested directly so the check is DB-uniform and avoids unrelated real-document-delete cascades — e.g.
// the comments plugin patches every collection's afterDelete with a numeric `documentId` filter that
// is Mongo-incompatible. The end-to-end hook path itself is covered by unit tests + the SQL runs.
const cleanupDocId = `cleanup-${created.id}`;
for (const locale of ["de", "fr"]) {
  await payload.create({
    collection: SLUG,
    data: {
      collectionSlug: "articles",
      documentId: cleanupDocId,
      targetLocale: locale,
      sourceLocale: "en",
      sourceFingerprint: "fp-doc",
      translatedAt: new Date().toISOString(),
      dismissedFingerprint: null,
    },
  });
}
const before = await payload.find({
  collection: SLUG,
  where: { documentId: { equals: cleanupDocId } },
  pagination: false,
});
await payload.delete({
  collection: SLUG,
  where: {
    and: [{ collectionSlug: { equals: "articles" } }, { documentId: { equals: cleanupDocId } }],
  },
});
const after = await payload.find({
  collection: SLUG,
  where: { documentId: { equals: cleanupDocId } },
  pagination: false,
});
if (before.totalDocs === 2 && after.totalDocs === 0)
  ok(`deleteByDocument cleared all locales (${before.totalDocs} → ${after.totalDocs})`);
else fail(`deleteByDocument failed (before=${before.totalDocs}, after=${after.totalDocs})`);

// Tidy up the step-2 row so re-runs stay clean.
await payload.delete({ collection: SLUG, where: { documentId: { equals: "verify-doc-1" } } });

console.log(process.exitCode ? `── ${ADAPTER}: FAILED ──` : `── ${ADAPTER}: PASSED ──`);
process.exit(process.exitCode ?? 0);
