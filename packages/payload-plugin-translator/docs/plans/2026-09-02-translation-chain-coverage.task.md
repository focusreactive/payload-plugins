# Task contract — cover the translation chain and its input combinations

Follows [2026-09-01-locale-safe-writes-rework.md](./2026-09-01-locale-safe-writes-rework.md),
whose open question about the source read this task closes.

**Risk: HIGH.** Mostly tests, but D1 changes what gets translated.

## The principle, now decided

Mirror Payload's own "what the editor is looking at":

- **Source** — the current version of the source locale: the newer draft when one exists,
  else the published row. Its own content only, never a locale fallback.
- **Translation write** — always the draft layer, so switching locale in the admin shows
  it immediately.
- **Publishing** — a separate step that `publish_on_translation` alone gates.

This replaces the "Source is read from the published row … needs its own decision" entry
in the design doc, which must be rewritten as a decision.

## Design decisions

**D1 — the source read passes `fallbackLocale: false`.**
Measured (`recon/source-locale-fallback.txt`), with `fallback: true` in the config:

```
read fr, no fallbackLocale arg → "Hello from EN"
read fr, fallbackLocale: false → undefined
translate FROM an empty fr     → de becomes "NE morf olleH"
```

So asking to translate *from French* produces a German translation of the **English**
text, and provenance fingerprints the substituted content as if it were French.
Rejected: leaving it. It contradicts the principle (the editor sees `fr` empty), it makes
`skip_existing` and staleness reason about a phantom source, and the target reads already
pass `fallbackLocale: false` — the asymmetry was never intended.

**D2 — extend the existing specs; add exactly one new file, for source-locale semantics.**
`strategy-publish-matrix.int.test.ts` is already the table-driven combination spec and
`stale-detection.int.test.ts` owns freshness, so the combination and freshness gaps go
there. Rejected: a file per axis — each costs ~1.7 s of fixed fork+boot overhead against
a ~19 s suite.

The one exception is forced by the config: `fallback` is a **localization-level global**,
the shared fixture sets it to `false`, and one Payload boot per file means it cannot be
turned on for a single case inside an existing spec. With fallbacks off the D1 defect is
unobservable, so criterion 2 has nowhere to live. `source-semantics.int.test.ts` boots
with `fallback: true` and owns both source-side rules — what the source locale resolves
to, and which version of it is read.

**D3 — collection shapes go in each spec's local fixture set, via `bootTestPayload({ collections })`.**
Rejected: adding `plain`/`versioned`/`auto` to the shared `buildTestCollections()` — that
makes all eleven specs boot a wider schema for shapes only two of them exercise.

**Placement:** the D1 change in `server/shared/payload/sourceDocument.ts` (one helper,
serving both the write path and the staleness recompute, so both move together). Tests in
the two existing specs plus `handler.test.ts` for the read shape.

**New surface:** none.

**Written contract owed:** none new. `resolveTargetLayer`'s stays as is.

**Escalate to architecture:** no.

## Acceptance criteria

1. **Source reads its own locale only.** `fetchSourceDocument` passes `fallbackLocale: false`;
   a unit test pins the whole `findByID` argument object.
2. **Translating from an empty source locale translates nothing** — the target is not
   filled with the default locale's text. (Currently fails: measured above.)
3. **Source = current version.** With a published source that has a *newer draft*, the
   draft's text is what gets translated. Untested anywhere today.
4. **A never-published source still translates**, and its translation is **not stale**
   immediately after (the defect found in live use).
5. **Freshness holds immediately after translation on a collection with drafts**, in draft
   mode and in publish mode.
6. **Freshness holds immediately after translation on a collection WITHOUT drafts.**
7. **Freshness still breaks when it should:** editing the source without re-translating
   marks the locale stale.
8. **A no-drafts collection is written exactly as on `main`** — no `draft` key, no publish
   step, `autosave: false`.
9. **`skip_existing` on a no-drafts collection** leaves an existing translation alone and
   writes nothing.
10. **Publish flag on a no-drafts collection is inert** — no `publishSpecificLocale` write.
11. **A colleague's pending draft edit survives a draft-mode translation.**
12. **Publishing takes the current draft live**, including values the translation did not
    touch.
13. **Nothing to translate still publishes** when the flag is set; publishes nothing when
    it is not.
14. **The design doc records the principle as decided**, and no longer lists the source
    read as an open question.
15. **Checks clean:** `check-types` both packages, package unit tests, integration tests,
    `lint` with no warnings beyond the 59-warning repo baseline.
16. **Every new test bites** — mutation evidence for criteria 2, 3, 4, 6 and 9.

## Risks

- D1 changes behaviour for anyone who relied, knowingly or not, on the fallback filling an
  empty source. It is a `fix:` — the previous behaviour mislabels whose text was
  translated — but it must reach the README and the changelog.
- The suite grows by ~20-25 cases; the fixed per-file cost is unchanged because no new
  file is added.
- `apps/dev`'s `check-types` cannot see fixture-slug type errors (`tsconfig.check.json`
  omits `payload-types.ts`). Not fixed here; do not add to the 52 existing occurrences.
