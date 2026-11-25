# The server reads the state

Source: 2026-11-18-the-server-reads-the-state.source.local.md

**Status:** definition · **Risk:** high · **Branch:** `feat/translator-admin-ui-on-stubs`

Next: design

## Problem Statement

The 1.0 admin reads a document's and a list page's translation state from two routes that no real
code serves. A stub module answers them from a hard-coded fixture, and the branch cannot merge while
that is true. The underlying need is not "write two handlers": it is that **the plugin does not
today hold most of what the admin asks for**. The answer's shape was settled in design and then
built against a fixture, so the gap between the shape and the server went unmeasured. This
definition measures it.

Of the fourteen values the two answers carry, three can be produced today, four can be produced from
data that exists but no function returns, and seven have no source at all — two of them because a
column was deliberately deleted or never projected.

## Codebase map

All paths under `packages/payload-plugin-translator/src/` unless stated.

### The contract (already fixed, not to be redesigned)

| File | Holds |
|---|---|
| `types/wire/DocumentTranslationState.ts:5-50` | `LeafVerdict`, `ContentState`, `TreeNode`, `LocaleState`, `DocumentTranslationState` |
| `types/wire/ListTranslationState.ts:5-21` | `ListLocaleState`, `ListDocumentState`, `ListTranslationState` |
| `types/wire/RunState.ts:3-20` | `RunState` — carries `locales[]` and `queuedAt`; **no run handle** |
| `types/wire/endpoints.ts:5-13` | the one spelling of every path |

### What serves these routes today

| File | Role |
|---|---|
| `server/modules/translation-stub/http/reads.ts:34-66` | the two stub handlers |
| `server/modules/translation-stub/model/StubWorld.ts:108-142` | the fixture answers |
| `server/modules/translation-stub/scenarios/fixtureDocument.ts:7-34` | the hard-coded tree, `excluded`, seed verdicts |
| `server/modules/translation-stub/http/localesOf.ts:7-14` | locale list; `source = localization.defaultLocale` |
| `server/modules/translation-stub/http/refusals.ts:1-4` | `NOT_MANAGED`, `NO_LOCALIZATION` |
| `composition/modules/translationStub.ts:33-43` | registration |

### Reusable pieces

| Piece | Where |
|---|---|
| source read honouring host access | `shared/payload/sourceDocument.ts:29` (`fetchSourceDocument`) |
| visibility filter over many ids | `shared/payload/collections.ts:25` (`visibleIds`) |
| configured locale codes | `core/domain/locales/resolveLocales.ts:68-76` (`Locales.knownCodes`) |
| source fingerprinting | `core/domain/content-projection/sourceFingerprinter.ts:17` |
| receipt parsing, `UNANSWERED` | `server/modules/provenance/SourceFingerprint.ts:13,49` |
| per-leaf comparison | `core/domain/provenance/staleness.ts:31-42` (`changedLeaves`) |
| run rows per document | `server/modules/runs/RunRecord.store.ts:164` (`findByDocument`) |
| newest run per locale | `server/features/get-document-status/model.ts:61` (`latestPerTargetLocale`) |
| exclusion flag | `core/domain/field-config/getFieldConfig.ts:31-35` |
| in-process endpoint driver | `apps/dev/src/integration/translator/callEndpoint.ts` |

### What the answer needs, and whether the server can produce it

| Value | Today |
|---|---|
| `collection`, `id` | **exists** — route params, validated as `get-document-status/handler.ts:29-31` does |
| `locales[].locale` | **exists** — `Locales.knownCodes` |
| `tracked.translatedAt` | **exists** — receipt, `DocumentStaleness.service.ts:92` |
| `verdicts` | **partial** — `changedLeaves` answers two values; the raw data distinguishes four, no function does |
| `run.status`, `run.queuedAt` | **partial** — `latestPerTargetLocale` maps four of five statuses; `completed` must become `null` |
| `run.message` | **partial** — `row.error` is nullable, the wire demands a string |
| `sourceLocale` | **exists** — `policy.sourceLocale ?? localization.defaultLocale`, as `AutoTranslateEnqueue.hook.ts:57-58` resolves it |
| `tree` | **missing** — the projected schema drops `label` and `required` (`projectFieldLike.ts:11-27`, `FieldLike` at `types.ts:39-48`) |
| `excluded` | **missing** — exclusion is read per leaf; no label is ever collected |
| `content.empty` / `untracked` / `filled` | **missing** — nothing reads a target locale's values outside a run |
| `mustInclude` | **missing** — nothing reads Payload `required`, nothing reads target values |
| `run.locales[]` | **missing** — rows share a handle but nothing groups them (`runAssignments.ts:14-24` drops locales) |
| `run.failedLocale` | **missing** — an abandoned row does not name the sibling that failed |

### Prior art

- `docs/plans/2026-10-23-what-the-admin-needs-from-the-server.md` — the settled server design, §1–8.
- `docs/plans/2026-11-13-admin-ui-1.0.research.md` — the admin research; its Size check names this slice first.
- `docs/plans/2026-11-13-admin-ui-on-stubs.design.md` — build steps; step 13 removes the stub.
- `docs/plans/2026-11-13-admin-ui-on-stubs.seam-trace.md` — findings 5 and 6, both resolved in the design's decision log.

## External dependencies

None. Every value is derived from the host's own Payload config, the host's documents, and the
plugin's two sidecar collections.

## Settled before this definition — not to be re-argued

- **No new `TranslatorAction` members.** `document-state` is guarded by `document-status`,
  `list-state` by `collection-status` (design decision log, finding 6).
- **The real-server check runs in the `apps/dev` integration tests**, not in the client contract
  suite, which holds scenario-free invariants only (finding 5).
- **`RunState` carries no run handle** — only `locales[]`, `queuedAt` and the status.
- **No staleness in the list answer.** The list says translated-or-not and when; drift there would
  cost a source read and a hashing per row (23.10 §5).
- **`untracked` is never folded into `empty`** (23.10 §2).

## Size check

**Too large for one task.** It introduces a walker the package does not have, a target-locale read
the package does not make, a four-way split of an existing two-way answer, and two routes — four
independent pieces of work, three of which can land and be tested alone. Proposed split:

1. **The document's shape** — a walker over the host's raw collection config producing `tree`,
   `excluded` and the `required` flags. The largest piece and the one with no prior art here.
2. **The per-leaf verdict** — split the two-way drift answer into the four `LeafVerdict` values, in
   one computation shared with the run's filter (23.10 §1).
3. **A locale's content** — the target-locale read behind `empty` / `untracked` / `filled`.
4. **The two routes** — assembly, registration, access, refusals, and the `apps/dev` gate. Depends
   on 1–3.

This definition covers all four; each gets its own task file.

## Requirements

- R1 (in) `GET {basePath}/document-state/:collection_slug/:collection_id` is served by real code and
  answers `DocumentTranslationState` as the wire type declares it.
- R2 (in) `GET {basePath}/list-state/:collection_slug?ids=…` is served by real code and answers
  `ListTranslationState`, reading only the ids asked for.
- R3 (in) The server produces a labelled, nested tree of a saved document's translatable fields:
  groups, leaves with `required`, and a block list localized as a whole as one `whole-list` node.
- R4 (in) The server produces the labels of the fields excluded from translation.
- R5 (in) The per-leaf drift answer distinguishes all four `LeafVerdict` values, computed once and
  shared with the filter a run applies, rather than in two places.
- R6 (in) A locale's content is reported as one of `empty`, `untracked`, `filled` or `tracked`,
  deciding `empty` from the target's values and never from the presence of a receipt.
- R7 (out) [inferred] rests on: a lock on a checkbox cannot fill a required field the plugin does not translate, and cannot see a host's own `validate` function. `mustInclude` leaves the contract; see `2026-11-18-before-the-admin-meets-the-server.md`.
- R8 (in) A locale's `run` names every locale the run covers, and an abandoned locale names the
  sibling whose failure ended the run.
- R9 (in) [inferred] rests on: the admin design's decision log settles finding 6 this way, and the stub already registers both reads under exactly these two actions. Both routes are registered beside the plugin's other reads and guarded by the existing `document-status` and `collection-status` actions, adding no action to the published union.
- R10 (in) Both routes answer the refusals the stub answers: a collection the plugin does not
  manage, and a host with no localization.
- R16 (in) [inferred] rests on: `fetchSourceDocument` already refuses to distinguish "absent" from "refused" (`shared/payload/sourceDocument.ts:26-27`), and the stub answers a full state for any id, which hands the collection's tree to a caller with no read access. A document that does not exist, and one the caller may not read, both answer `404`.
- R11 (in) [inferred] rests on: the admin design's decision log resolves finding 5 by putting the real-server check in the `apps/dev` integration tests, and `callEndpoint.ts` builds its request from `payload`, `routeParams`, `json` and `user` only. The harness must be able to drive both routes against a real Payload boot, which today it cannot for `list-state` because no query string reaches the handler.
- R12 (out) Removing the stub module. That is step 13 of the admin design and follows this work.
- R13 (out) Removing the old `document-status`, `collection-status` and staleness routes. They are
  published surface; their removal is a breaking change of its own, named in the migration notes.
- R14 (out) [inferred] rests on: 23.10 §6 designs it as a write path on `afterChange`, and nothing in the two read answers depends on it. The hook that clears a leaf's drift when someone edits the target field is out; it can land after the admin works.
- R15 (out) [inferred] rests on: the admin research's R21 defers every per-leaf mark to the end of the major, while its R1 keeps "N fields behind" per locale. Showing drift below the level of a document's locale is out; the server still computes the per-leaf map, because that count is taken over it.

### Non-functional scan

- **Performance** — relevant. The list answer is one request per list page; the document answer
  hashes a source document. See Risks for the row cap and the per-row cost.
- **Security / access control** — relevant. Both reads must honour the host's read rules per
  document, and must not let a caller learn that a document they cannot read exists.
- **Accessibility** — N/A. No rendering in this work.
- **i18n / localization** — relevant. Field labels may be a string or a per-language map, as locale
  labels are; the answer carries one language's label.
- **Observability** — relevant. A locale silently dropped because its source could not be read is
  how the current staleness service behaves; this work should decide whether to keep that.

## Acceptance Criteria (draft)

| AC | Covers | Criterion | How it is checked |
|---|---|---|---|
| AC1 | R1 | A saved document with two target locales answers 200 with one `LocaleState` per target, against a real Payload boot | `apps/dev` integration test |
| AC2 | R1, R6 | A locale never translated and holding no values reads `empty`; one holding values with no receipt reads `untracked` | `apps/dev` integration test, two locales in one document |
| AC3 | R3 | The tree of a seeded document names its groups and leaves with the labels the collection config gives, and marks a required leaf `required: true` | unit test over a fixture collection config |
| AC4 | R3 | A block list localized as a whole appears as one `whole-list` node carrying its leaf addresses, not as a group of per-block leaves | unit test |
| AC5 | R4 | A field carrying the exclusion flag appears in `excluded` by its label and in no tree node | unit test |
| AC6 | R5 | Over one receipt, a leaf whose hash matches reads `current`, one whose hash moved reads `drifted`, one recorded `UNANSWERED` reads `unanswered`, one absent from the receipt reads `unrecorded` | unit test, four leaves in one document |
| AC7 | R5 | The filter a run applies and the admin's verdicts come from one function | a test asserting the run's "translate this leaf" set equals the non-`current` verdicts |
| AC10 | R8 | A run covering two locales reports both in `run.locales` on each of them | `apps/dev` integration test |
| AC11 | R8 | A locale abandoned after a sibling failed reports `not-started` and names that sibling in `failedLocale` | `apps/dev` integration test |
| AC12 | R2 | A list request for three ids answers only those three, in the order asked | `apps/dev` integration test |
| AC13 | R2 — **negative** | An id the caller may not read is absent from `docs` rather than refused or reported as empty | `apps/dev` integration test with a restrictive access rule |
| AC14 | R9 | Neither route adds a member to `TranslatorAction`, and each answers 403 under a refusing guard | `grep` over `types/TranslatorAction.ts` plus the existing guard test extended to the two routes |
| AC15 | R10 | An unmanaged collection answers 400, and a host with no localization answers 400 with the same messages the stub uses | unit test over the handlers |
| AC21 | R16 — **negative** | A document that does not exist and one the caller may not read both answer 404, with no body telling them apart | `apps/dev` integration test with a restrictive access rule |
| AC16 | R11 | The harness drives `list-state` with a query string | the `apps/dev` test of AC12 runs |
| AC17 | — | No new type errors | `bun run check-types` |
| AC18 | — | The package suite stays green | `bunx vitest run` |
| AC19 | — | No new lint findings | `bunx oxlint .` — at most 26 warnings, 0 errors |
| AC20 | — | The published package still builds under the real `tsc` | repo root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` |

## Open Questions

1. **`mustInclude` — who computes it** *[resolved]* — 23.10 §3 states the server supplies it
   ("it can see the target's values and the client cannot"), while that document's own Open section
   still lists the choice as undecided. The two contradict each other. Matters because: it decides
   whether this work reads every target locale of a document — the single largest cost in the
   document answer — or whether the client reads the target document it is already rendering.
   **Resolved 2026-11-18: neither. The field leaves the contract.** A required localized field the
   plugin cannot translate — a `number`, a `select`, an excluded text field — is unfillable by any
   run, so no lock helps; and a host's own `validate` defeats the rule anyway. Where a collection
   has no drafts the admin withholds field selection altogether instead.

2. **`dismissed` has no source, and the design that asked for it is obsolete** *[resolved]* — 23.10
   §7 assumed a stored `dismissedFingerprint`, which was **deleted the next day** (ledger entry
   `the-dismissed-fingerprint-leaves-the-receipt`, 2026-10-24). Dismissal now rebases
   `sourceFingerprint`, so after it the leaves genuinely read `current` and nothing records that a
   person hid a mark. The wire demands the field and the client reads it
   (`client/entities/translation/model/localeRow.ts:59`). Matters because: answering it needs a new
   column on the receipt collection and a migration, and the alternative is to drop it from the wire.
   **Resolved 2026-11-18: the flag leaves the wire; the dismissal feature stays whole.** Restoring a
   stored dismissal would restore the two-fingerprint shape that made the button lie.

3. **What a document the caller cannot read answers** *[resolved]* — the stub answers a full state
   for any id, including one that does not exist. `get-document-status` answers `200 []` for an
   invisible document. Matters because: the first leaks the collection's shape and the existence of
   an id to someone with no read access; the second is a different contract from the one the client
   was built against. **Resolved 2026-11-18: `404` for both, told apart by nothing**, as
   `fetchSourceDocument` deliberately conflates them (`shared/payload/sourceDocument.ts:26-27`). A
   `403` would confirm the id exists; a `200` would hand the collection's tree to someone with no
   read access.

4. **Which locale is a document's `sourceLocale`** *[resolved]* — nothing stores one. Three
   conventions exist: the host's `defaultLocale`, the collection's auto-translate
   `policy.sourceLocale`, and the per-target `sourceLocale` on each receipt, which can differ
   between locales of one document. Matters because: the tree, the verdicts and `mustInclude` are
   all computed against it, and the branch-review decision of 13 November already fixed the panel's
   source as "the document's source locale, shown as text" — which the server must now define.
   **Resolved 2026-11-18: `policy.sourceLocale ?? localization.defaultLocale`**, the resolution
   auto-translate already uses (`AutoTranslateEnqueue.hook.ts:57-58`). The receipts' disagreement is
   not a conflict: the top-level field is the default for the next run, while each locale's drift is
   already computed against the source its own receipt names. Rejected: the locale the admin is
   currently viewing — standing in a translated locale would make it the source and offer the
   original as a target.

5. **Field labels under i18n** *[non-blocking]* — a Payload field label may be a string or a map
   keyed by admin language, and a block instance has no label at all; Payload's own admin solves the
   second with `RowLabel`, which is a function the plugin cannot run server-side. Default taken:
   one language's label, the block's type name plus its position where no label exists.

6. **A locale whose source cannot be read** *[non-blocking]* — the staleness service silently drops
   it (`DocumentStaleness.service.ts:85`). Default taken: keep that behaviour, and report the locale
   with no verdicts rather than omitting the locale.

7. **Order inside the list answer** *[non-blocking]* — the stub preserves the order asked. Default
   taken: keep it, and let an unknown id be absent rather than a hole.

8. **The row cap on the list read** *[non-blocking]* — a list answer built from
   `findLiveForDocuments(slug, ids)` is bounded by page size and safe; one built from
   `findLiveInCollection` is not. Default taken: the per-ids read.

## Decisions by the owner

- 2026-11-18 — decided by the owner: `mustInclude` leaves the contract; a lock cannot fill a field
  the plugin does not translate, nor see a host's own validator.
- 2026-11-18 — decided by the owner: a collection with drafts has its translation written as a
  draft and published by a person; one without drafts is written live and offers no field selection.
- 2026-11-18 — decided by the owner: the `dismissed` flag leaves the read answer; the dismissal
  feature itself is untouched.
- 2026-11-18 — decided by the owner: a document's `sourceLocale` is the collection's
  auto-translate source where it has one, otherwise the host's default locale — never the locale the
  admin happens to be viewing, which would offer the original as a target.
- 2026-11-18 — decided by the owner: the work ships as several commits on this branch, all of them
  before the admin is joined to the server. The order is in
  `2026-11-18-before-the-admin-meets-the-server.md`.

## Risks & Constraints

- **The schema map cannot build the tree.** `projectFieldsToFieldLike` keeps `type`, `name`,
  `localized`, `custom`, `fields`, `blocks` and `tabs` and nothing else; `FieldLike` does not even
  declare `label` or `required`. The tree needs a second walker over the host's raw collection
  config, or a widened projection — and the projection is published surface.
- **The receipt has six columns and none of them is a dismissal.**
  `Provenance.collection.ts:26-31`. Question 2 above.
- **Every read of the run record truncates at 500 rows without saying so**
  (`RunRecord.store.ts:43-47,217-227`). The per-document read is safe at page size; the
  collection-wide read is not.
- **The document answer costs a source read and a full hashing per document.** The list answer must
  not do that, by 23.10 §5 — which is why the list's `content` is only `empty` or `filled`.
- **Two routes must not be registered twice.** Registering the real reads while the stub is listed
  is refused at boot by the duplicate-path check added in step 2, so the stub module and the real
  reads cannot both be on. That is the swap of step 13, and it means these routes cannot be
  exercised in the sandbox's stub mode.
- **The branch merges only after the stub is gone**, and every merge to `major/translator`
  publishes a prerelease.

## Consistency self-check

- No criterion contradicts an OUT requirement: AC6 computes the per-leaf map that R15 keeps out of
  the UI, which is the stated split, not a contradiction.
- Every IN requirement has at least one criterion.
- The coverage scan's items are each either answered in Requirements or listed as an Open Question.
- Still soft: the size of the tree walker is an estimate, because no comparable walker exists in
  this package to measure against.

## Readiness

- Unresolved `[blocking]` questions: **0**.
- IN requirements with no Acceptance Criterion: **0**.

Ready for design — the four slices of the Size check need their boundaries decided
before any of them is built. Likely vectors: `contract` (two new payloads over the host's own
config and documents), `security` (both reads answer per document under the host's read rules) and
`runtime` (one request per list page, a source read and a hashing per document).
