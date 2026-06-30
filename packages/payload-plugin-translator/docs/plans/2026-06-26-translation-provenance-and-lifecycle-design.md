# Translation provenance & lifecycle events — design

**Date:** 2026-06-26
**Status:** Draft (first pass — to be refined before implementation)
**Tracks:** [#47](https://github.com/focusreactive/payload-plugins/issues/47) — foundation for
[#50](https://github.com/focusreactive/payload-plugins/issues/50) (stale detection),
[#51](https://github.com/focusreactive/payload-plugins/issues/51) (auto-translate on source change),
[#49](https://github.com/focusreactive/payload-plugins/issues/49) (global dashboard).
**Scope:** Two new server-side primitives — (1) a durable, per-`(collection, document, locale)`
record of *what a translation was derived from*, and (2) plugin-config lifecycle callbacks fired by
the runner. New public config surface → `@since` to be set from the next release bump.

> **Revision needed (architecture review, 2026-06-26 — see `2026-06-26-architecture-review.md`).**
> This doc assumes the fingerprint reuses the existing translation field-collector as **one shared
> projection**. The review found that does **not** hold against the current pipeline: translation
> content lives in `textMap: Record<number, string>` (index-keyed, order-dependent) and
> `FieldChunkCollector.leaf` **fuses mutation into the traversal** (writes data + emits live
> write-handles). A read-only, id-path-keyed projection cannot be factored out without splitting read
> from write — otherwise the fingerprint becomes a **second independent traversal that can drift**
> from translation's notion of a translatable leaf (silent false-stale). Two consequences for this
> design: (1) the `idPath` must be a **branded type with a documented grammar** (a bare `string`
> can't distinguish positional `content.0.title` from id-based `content.<id>.title` — the reorder
> guarantee depends on the latter); (2) the shared `ContentProjector` this doc relies on is built in
> **slice 6** of the core extraction (read/write split), which is a prerequisite, not a given.

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

### Storage: plugin-managed sidecar collection

Store provenance in a **separate plugin-owned collection**, keyed by
`(collectionSlug, documentId, locale)` — **not** as hidden fields on consumer collections. Hidden
fields would force schema/migration changes onto every consumer collection; a sidecar keeps the
blast radius inside the plugin. The collection is injected the same way the plugin already injects
config, via a config modifier through `PluginConfigBuilder` (see `src/plugin.ts`).

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

The sidecar slug must not clash with a consumer collection or with another plugin's table. Options
to decide on:

- a distinctive default slug (e.g. `translator-provenance` / `_translator_translations`), **plus**
- a config override (`provenance: { slug?: string }` or similar) so a consumer can rename on a clash,
- and a startup guard: if the chosen slug already exists in `config.collections`, fail fast with a
  clear error rather than silently colliding.

(Exact slug + override shape: open question.)

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

- Callbacks must not break the translation if they throw — wrap and log; a failing callback is the
  host's problem, not a reason to fail the run. (Confirm desired semantics.)
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

## Open questions (to resolve in the next pass)

1. **Fingerprint algorithm** — exact hash input (normalized JSON of the translated source leaf set?),
   hash function, and how rich text (Lexical) is normalized before hashing.
2. **Version-based fingerprint** — offer it as an opt-in when consumer has versions enabled? Or defer
   entirely?
3. **Sidecar slug** — default name + override config shape + collision guard behaviour.
4. **SQL migration story** — how the table is created across consumers we don't own the migrations
   for; documented manual step vs. anything we can automate.
5. **Provenance lifecycle** — what happens on document delete (cascade-clean the records?), and on a
   collection being removed from the plugin config.
6. **Callback error semantics** — swallow-and-log vs. surfacing.
7. **Status endpoint merge shape** — how the durable + live layers combine in the response model
   without breaking existing consumers of `get-document-status` / `get-collection-status`.

## Out of scope

- Grouping translation variants into editorial sets / market-region models — consumer-specific
  (per the epic #52), builds on these primitives but lives in the consuming app.
- Admin UI for the indicators/dashboard — that is #50 / #49.
