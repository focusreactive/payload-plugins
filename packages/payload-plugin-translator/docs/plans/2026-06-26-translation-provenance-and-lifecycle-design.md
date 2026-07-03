# Translation provenance & lifecycle events — design

**Date:** 2026-06-26
**Status:** Ready for implementation — all open questions resolved 2026-07-02. Four decisions
(scope, sidecar slug, callback-error semantics, delete cleanup) are marked **[pending confirm]**
below: they use the recommended default and can be overridden before the relevant slice is coded.
**Tracks:** [#47](https://github.com/focusreactive/payload-plugins/issues/47) — foundation for
[#50](https://github.com/focusreactive/payload-plugins/issues/50) (stale detection),
[#51](https://github.com/focusreactive/payload-plugins/issues/51) (auto-translate on source change),
[#49](https://github.com/focusreactive/payload-plugins/issues/49) (global dashboard).
**Scope:** Two new server-side primitives — (1) a durable, per-`(collection, document, locale)`
record of *what a translation was derived from*, and (2) plugin-config lifecycle callbacks fired by
the runner. New public config surface → `@since` to be set from the next release bump.

> **Revised — slice 6 shipped the prerequisite (2026-07-01).** The architecture review
> (`2026-06-26-architecture-review.md`) flagged that the "one shared projection" this doc relies on
> did not exist: translation content lived in `textMap: Record<number, string>` (index-keyed,
> order-dependent) and `FieldChunkCollector.leaf` **fused mutation into the traversal**, so a
> read-only, id-path-keyed projection could not be factored out — leaving the fingerprint as a
> second, driftable traversal. **Slice 6 of the core extraction resolved both** (see
> `2026-06-30-slice6-contentprojector-idpath-design.md`, option B):
>
> - The shared **`ContentProjector` is now real, not hypothetical**:
>   `projectTranslatableContent(doc, schema): Array<{ idPath, text }>`
>   (`src/server/shared/content-projection/contentProjector.ts`), pure and read-only, built on the
>   same `walkFields` engine, the same leaf-selection predicate, and the same text extraction the
>   translation pipeline uses. `FieldChunkCollector` was refactored onto that same selection core and
>   its mutation un-fused into an explicit apply pass; a **drift-guard test** pins that projection and
>   translation agree on the translatable set + source text.
> - **`idPath` is the branded type from slice 6** (`src/server/shared/content-projection/idPath.ts`),
>   with a documented grammar and a single constructor (`makeIdPath`): array/blocks element indices
>   are replaced by the element `id` (`+ blockType`), so the reorder guarantee holds. A bare `string`
>   positional path (`content.0.title`) is no longer representable.
> - The staleness baseline is therefore concrete:
>   **`CURRENT = fingerprint(projectTranslatableContent(sourceDoc, schema))`**
>   (`src/server/shared/content-projection/fingerprinter.ts` — sorts entries by `idPath` then
>   sha256-hashes, so reorder is invisible and only real content change moves the hash), computed
>   lazily on read (this slice unchanged) or at write-time later if dashboard perf demands.

---

## Motivation

The plugin translates a document and then forgets everything. After writing the translated value
into the target locale, nothing persists **which source state produced it**, and nothing notifies
the host app that a translation happened. Two consequences:

1. **No way to know a translation is out of date.** When the source locale is edited after a target
   was translated, the target is stale — but the plugin has no recorded baseline to compare against.
   This blocks #50 and the cost-saving "only translate what drifted" path of #51.

2. **Status is tied to the runner.** Today `get-document-status` / `get-collection-status` read
   straight from the runner queue (`runner.findByCollection(...)` in
   `src/server/features/get-document-status/handler.ts`). So "status" really means "is there a task
   in the queue, and in what state". Once a job finishes and is cleaned up — or when the in-memory
   sync runner's process ends — the status is gone. There is no durable answer to "is this locale
   translated at all, and when".

### The status insight (drives the design)

We currently conflate two different things and only persist one:

| | What it answers | Lifetime | Source of truth |
| --- | --- | --- | --- |
| **Run progress** (have today) | queued / running / done / failed for *this run* | transient — disappears with the job | runner queue |
| **Translation state** (missing) | is locale X translated? when? from what? is it stale? | durable — outlives any job | *nothing yet → provenance record* |

The fix is to stop using run progress as a proxy for translation state. Provenance gives us the
durable layer. The status endpoints then become a **merge**: provenance as the base ("translated 3
days ago, source since changed → stale"), with live runner state overlaid when a run is active
("…and a translation is running right now"). This also makes status **runner-independent** — the
same answer whether the host uses the Payload Jobs runner or the sync runner.

---

## Primitive 1 — Translation provenance

On successful translation of `(document, targetLocale)`, record a small receipt:

- `collectionSlug`
- `documentId` (id-agnostic — string|number, matching existing job handling)
- `targetLocale`
- `sourceLocale`
- `sourceFingerprint` — see below
- `translatedAt` (timestamp)
- `dismissedFingerprint` (nullable) — for #50's dismissable stale indicator: the source fingerprint
  the editor acknowledged as "stale but leave it". Indicator hides while
  `dismissedFingerprint === currentSourceFingerprint`.

Staleness (computed later, in #50) = `currentSourceFingerprint !== record.sourceFingerprint`.

### Fingerprint: content hash vs. version/updatedAt

Issue #47 allows either "a hash of the translated source fields" **or** "the source document's
`updatedAt`/version". They are not equivalent:

- **Document `updatedAt` / version id** is *per document, not per locale or per field*. In Payload a
  single document holds all locales; editing any locale or any unrelated field bumps `updatedAt` and
  creates a new version. Using it as the fingerprint → false "stale" signals on every unrelated edit.
- **Hash of the translated source leaf fields** is precise: it only changes when the content the
  translation actually depended on changes. This matches the field-granularity reasoning already
  established in `2026-06-12-cross-locale-block-identity.md`.

**Leaning:** hash of the localized source leaf fields that were sent to the provider (we already
collect exactly this set in the pipeline — `FieldChunkCollector`). Version id can be offered later as
an opt-in cheaper fingerprint *for consumers who have versions enabled*, but it cannot be the default
because versions are opt-in and coarser. (Open question below.)

### Storage: plugin-managed sidecar collection (opt-in)

Store provenance in a **separate plugin-owned collection**, keyed by
`(collectionSlug, documentId, locale)` — **not** as hidden fields on consumer collections. Hidden
fields would force schema/migration changes onto every consumer collection; a sidecar keeps the
blast radius inside the plugin. The collection is injected the same way the plugin already injects
config, via a config modifier through `PluginConfigBuilder` (see `src/plugin.ts`).

#### Opt-in, because it needs a consumer migration (drives the version bump)

The sidecar is a **new collection**, and on SQL consumers (Postgres/SQLite) a new collection means a
new table → a **migration the consumer must run**. We cannot run it for them (we don't own their
migration directory, DB creds, or migration ordering; Payload creates SQL tables only via
migrations). Silently forcing that on every consumer during an upgrade would be operationally
breaking — unacceptable in a patch/minor.

**Therefore the provenance collection is opt-in and default-OFF**, enabled by presence of a
`provenance` config key:

```ts
translatorPlugin({
  // ...
  provenance: { /* slug?: string */ },   // present = enabled; omit = disabled (default)
})
```

Consequences:

- A consumer who does **not** set `provenance` sees **zero change** on upgrade — no new collection,
  no migration, no behaviour change. So adding this feature is a backward-compatible **`feat` →
  minor** (`0.6.x → 0.7.0`), **not** breaking and not a patch.
- Enabling it is the programmer's **conscious act**. That is exactly where we tell them (JSDoc on the
  field + README) to generate/run the migration on SQL (`payload migrate:create` + `payload migrate`;
  dev push in development; MongoDB infers the collection with no migration).
- If they enable it but forget to migrate on SQL, Payload itself errors on the first provenance query
  with a clear "relation does not exist" — an acceptable, self-explaining failure. We do not attempt
  runtime table creation.

**Note the split:** only the *collection* is gated. The **lifecycle callbacks (Primitive 2) carry no
schema and no migration**, so they are always available regardless of the `provenance` flag.

#### Cross-database concern (raised in review — must be designed for)

The plugin is database-agnostic; consumers run Postgres, SQLite, or MongoDB. A new collection lands
differently on each:

- **Postgres / SQLite (Drizzle):** schema-driven. A new collection = a new table + a **migration**.
  The plugin does not own the consumer's migration directory (`apps/cms/src/database/` owns its
  own), so we must decide how the table gets created:
  - rely on the consumer running `payload migrate` / dev push after adding the plugin, and **document
    it** as a required step; and/or
  - keep the collection shape minimal and index-light so the generated migration is trivial.
- **MongoDB:** schemaless — the collection is inferred from config, no migration. It simply appears.

Implication: the sidecar must be a **plain, minimal Payload collection** (no exotic field types, no
DB-specific features) so the same config produces a clean table on SQL and an inferred collection on
Mongo. Migration generation/ordering on SQL is the main open risk — to be detailed in the next pass.

#### Name-collision concern (raised in review)

The sidecar slug must not clash with a consumer collection or with another plugin's table. Resolved:

- default slug **`translator-provenance`**, `admin: { hidden: true }`;
- override via **`provenance.slug`** so a consumer can rename on a clash;
- a **startup guard**: if the chosen slug already exists in `config.collections`, throw a clear error
  at init (fail fast, never silently share a table).

### Where it gets written

In the document translation path — `TranslateDocumentHandler` (the runner's `handler` in
`src/plugin.ts`) — after the target locale is successfully written, upsert the provenance record for
`(collection, documentId, targetLocale)`. The set of translated source leaf fields needed for the
fingerprint is already available at that point in the pipeline.

---

## Primitive 2 — Lifecycle callbacks

Add optional callbacks to `TranslatorPluginConfig` (`src/plugin.ts`), invoked by the runner:

```ts
translatorPlugin({
  // ...existing config...
  onTranslationQueued?:    (task: TranslationTask) => void | Promise<void>,
  onTranslationCompleted?: (task: TranslationTask) => void | Promise<void>,
  onTranslationFailed?:    (task: TranslationTask, error: unknown) => void | Promise<void>,
})
```

`TranslationTask` mirrors the descriptor the runner already threads through
(`{ collection, collectionId, sourceLng, targetLng, strategy }` — see `runnerContext.handler` in
`src/plugin.ts`):

```ts
type TranslationTask = {
  collection: string;
  id: string | number;
  sourceLng: string;
  targetLng: string;
  strategy: string;
};
```

Firing points:

- **queued** — at enqueue, for each task created (one per document, or per document×language once #46
  lands).
- **completed** — after a successful translation (same place provenance is written).
- **failed** — on a thrown error in the handler, with the error.

Constraints:

- **Always available, no migration.** Callbacks are just optional config functions — they carry no
  schema and no collection, so they are active regardless of the `provenance` opt-in flag and never
  require a consumer migration.
- Callbacks must not break the translation if they throw — wrap and log; a failing callback is the
  host's problem, not a reason to fail the run.
- They run server-side only.

This gives the host a push-based extension point (logging, notifications, cache invalidation, feeding
#49's dashboard) instead of polling the status endpoints.

---

## How the follow-ups consume this

- **#50 stale detection** — reads provenance, compares `currentSourceFingerprint` to
  `record.sourceFingerprint`; surfaces a per-locale indicator; writes `dismissedFingerprint` on
  dismiss.
- **#51 auto-translate** — `afterChange` on configured collections; uses the fingerprint to translate
  only drifted content; guards against loops (writing a target locale must not re-trigger).
- **#49 dashboard** — can subscribe to lifecycle events and/or aggregate provenance records across
  collections, instead of depending on jobs lingering in the queue.

---

## Decisions (resolved 2026-07-02)

Each numbered item is the former open question, now answered.

1. **Fingerprint algorithm — RESOLVED by slice 6.** No new algorithm. The source fingerprint is
   `sourceFingerprint = fingerprint(projectTranslatableContent(sourceDoc, schema))`, both from
   `@core` (`src/core/content-projection/`). `fingerprint` sha256-hashes the `{ idPath, text }`
   entries sorted by `idPath`, each length-prefixed. Rich text is normalized by the projector
   (text-nodes-only) — the **same** extraction sent to the provider, so drift can only be a real
   content change. Inherits the known "text-nodes-only" blind spot (formatting-only edits do not mark
   stale) — accepted, documented.
2. **Version-based fingerprint — DEFERRED.** v1 uses the content hash only. An opt-in
   `updatedAt`/version fingerprint (for consumers with versions enabled) can be added later,
   additively, without breaking the record shape. Not built now.
3. **Provenance collection is opt-in; slug guarded. [confirmed 2026-07-03]** The provenance *collection*
   is default-OFF, enabled by presence of a `provenance` config key (`provenance?: { slug?: string }`
   on `TranslatorPluginConfig`) — because it needs a consumer migration on SQL and must not be forced
   silently (see "Opt-in, because it needs a consumer migration"). Default slug `translator-provenance`,
   `admin: { hidden: true }`; override via `provenance.slug`; **startup guard**: if the chosen slug
   already exists in `config.collections`, throw a clear error at init (fail fast, never silently
   share a table). The **lifecycle callbacks are NOT gated** by this flag — they carry no schema.
4. **SQL migration — consumer-generated, documented.** The plugin ships only the collection *config*;
   the consumer's Payload creates the table (SQL prod: `payload migrate`; SQL dev: push; Mongo:
   inferred, no migration). The collection is deliberately minimal (all `text`/`date`, one composite
   index) so the generated migration is trivial. README gets a required post-install step.
5. **Delete cleanup — cascade-clean. [pending confirm]** An `afterDelete` hook injected on each
   configured collection deletes provenance rows for `(collectionSlug, documentId)`. A collection
   later removed from the plugin config leaves its rows orphaned (records simply stop updating) —
   tolerated and documented; no cross-run reconciliation in v1.
6. **Callback errors — swallow-and-log. [pending confirm]** Every lifecycle callback is wrapped in
   try/catch; a throw is logged via the Payload logger and never propagates. A failing host callback
   is never a reason to fail the translation (especially `onTranslationFailed`).
7. **Status endpoint merge — OUT OF SCOPE for #47, deferred to #50. [confirmed 2026-07-03]** #47 only
   *writes* provenance and exposes the sidecar collection as queryable. Merging the durable
   provenance layer into `get-document-status` / `get-collection-status` (the "runner-independent
   status" idea) is #50's job. To avoid a later migration, the `dismissedFingerprint` column is added
   to the schema **now** but left unused until #50.
8. **Version bump — minor `0.7.0`.** Because provenance is opt-in default-off and the callbacks are
   backward-compatible additions, adding this feature changes nothing for a consumer who does not
   opt in → it is a `feat` (minor), not breaking and not a patch. The public-API additions
   (`provenance` config, the three callbacks, `TranslationTask`) get `@since 0.7.0`. At 0.x a caret
   range (`^0.6.x`) will not auto-upgrade to `0.7.0`, so even opted-in SQL consumers pull it
   deliberately.

## Implementation slices

TDD (red tests first), each slice run through `/sp-finalize` (simplify + iterative-review + gate)
before its commit; tests are type-checked (tsconfig.check.json) and lint is run. New branch
`feat/translator-provenance` off updated `main`. The `ProvenanceStore` **port** + record type are
payload-free → they live in `@core`; only the Payload-backed store impl and hooks are adapter code.

- **Slice A — provenance store + sidecar collection (no wiring).**
  `TranslationProvenanceRecord` type + `ProvenanceStore` port in `src/core/provenance/`; the sidecar
  `CollectionConfig` factory (fields below, composite index, `admin.hidden`, slug override); a
  Payload-backed `ProvenanceStore` impl (upsert by composite key, find, `deleteByDocument`); the
  startup collision guard. Tests: collection shape + store CRUD against a fake payload.
- **Slice B — write provenance on successful translation (behind the opt-in flag).** Add the
  `provenance?: { slug?: string }` config; **only when present**, inject the sidecar collection +
  store into `plugin.ts` (config modifier), run the collision guard, and — in the document
  translation path — compute `sourceFingerprint` via the core projector+fingerprint and `store.upsert`
  after the target locale is written. When `provenance` is absent, nothing is injected and no write
  happens. Tests: opted-in → a record appears with the right fingerprint/locales/timestamp and
  re-translate updates the same row (upsert, not duplicate); opted-out → no collection, no write.
- **Slice C — lifecycle callbacks (always available, not gated).** Extend `TranslatorPluginConfig`
  with `onTranslationQueued` / `onTranslationCompleted` / `onTranslationFailed` + the `TranslationTask`
  type (with `@since 0.7.0`); fire queued at enqueue, completed after a successful handle, failed in
  the handler's catch (fire, then rethrow so the runner still marks the job failed). Callback errors
  swallowed-and-logged. Independent of the `provenance` flag. Tests: each fires with the right
  descriptor; a throwing callback does not break the translation.
- **Slice D — delete cleanup + docs.** When `provenance` is enabled, inject an `afterDelete` hook on
  configured collections → `store.deleteByDocument` (not injected when opted out). README: the opt-in
  `provenance` config, the required SQL migration step, the callbacks API, `@since 0.7.0`. Tests:
  deleting a document removes its provenance rows.

### Sidecar collection shape (slice A)

Minimal, DB-portable. All `text`/`date`; composite uniqueness on
`(collectionSlug, documentId, targetLocale)` is the upsert key.

| field | type | notes |
| --- | --- | --- |
| `collectionSlug` | text | indexed; part of upsert key |
| `documentId` | text | stringified even when numeric; part of upsert key |
| `targetLocale` | text | part of upsert key |
| `sourceLocale` | text | which locale was translated from |
| `sourceFingerprint` | text | `fingerprint(projectTranslatableContent(sourceDoc, schema))` |
| `translatedAt` | date | last successful translation time |
| `dismissedFingerprint` | text (nullable) | added now, unused until #50 |

## Out of scope

- Grouping translation variants into editorial sets / market-region models — consumer-specific
  (per the epic #52), builds on these primitives but lives in the consuming app.
- Admin UI for the indicators/dashboard — that is #50 / #49.
