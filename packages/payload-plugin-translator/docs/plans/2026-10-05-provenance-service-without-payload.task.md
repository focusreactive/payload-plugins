# Task contract — `ProvenanceService` without the Payload god type

**Risk: LOW.** One class, one wiring site, one test file. No behaviour change, and the module it
lives in already has 72 passing tests over it.

**Separate from** the per-field fingerprints work sitting in the same tree
(`docs/plans/2026-10-02-per-field-fingerprints.task.md`). That contract's D1–D7, `## Human choices`
and `## Review log` are settled and not reopened here. This earns its own commit.

---

## Phase 1 — what was found

**What `payload` actually buys the service: two things.**

| use | sites |
|---|---|
| `this.payload.logger.error({...})` | 4 — `:92`, `:139`, `:166`, `:206` |
| `fetchSourceDocument({ payload, ... })` | 1 — `:268`, inside `makeCurrentFingerprint` |

Nothing else. The whole god type is carried for a logger and one read.

**The cost is visible in the tests.** `Provenance.service.test.ts:30-35`:

```ts
function makePayload(findByID): Payload {
  return { findByID: vi.fn(findByID), logger: { error: vi.fn() } } as unknown as Payload;
}
```

A double cast to forge a type with a hundred members, for two of them.

**Precedent: the project already has the answer, in this very module.** The package's `CLAUDE.md`
states it as a rule — *"Functions/classes must not depend on Payload's god types … Define a narrow
structural interface with only the fields you touch — the real Payload type is assignable to it, so it
plugs in with no adapter and tests pass a tiny literal."* — and `Provenance.shapes.ts` already holds
exactly such slices (`ManagedCollectionEntry`, `ManagedCollectionsConfig`). Four `.shapes.ts` files
exist across the package. This task applies an established idiom rather than inventing one.

**Measured, not assumed: `payload.logger` is structurally assignable to a narrow slice.** Probed with
a throwaway file and `tsgo`:

```ts
type NarrowLogger = { error(details: Record<string, unknown>): void };
export function probe(payload: Payload): NarrowLogger { return payload.logger; }   // 0 errors
```

So the factory passes `payload.logger` straight through — no adapter, no wrapper.

**Blast radius: four files.** `Provenance.service.ts`, `Provenance.shapes.ts`, `Provenance.wiring.ts`,
and the service's test file. `ProvenanceServiceFactory` keeps its `(payload, scope)` signature — it is
the adapter — so its consumers (`translate-document/handler.ts`, both staleness handlers) are
untouched.

---

## Design decisions

**D1 — two dependencies of different shapes, deliberately.**

- **The logger is a structural slice.** It is an object whose method the service calls, and the live
  `payload.logger` satisfies the slice with no adapter (measured above). That is exactly what
  `.shapes.ts` is for.
- **The source read is a bound function.** `fetchSourceDocument` requires a real `Payload`, and
  narrowing *it* is out of scope for this task — so the service cannot hold a slice and call it. It
  receives the read already bound to a payload instead.

Rejected: one `deps` bag holding both. The two have nothing to do with each other, and the
constructor already takes its collaborators positionally in this codebase's style.

Rejected: giving the service a narrow `{ findByID }` slice and letting it call `fetchSourceDocument`
itself. It would be the tidier symmetry, but it requires narrowing `fetchSourceDocument`, which this
task is explicitly forbidden to touch — that function is the one place two earlier decisions live
(`enforcedAtTheRead`, `{ draft: true, fallbackLocale: false }`) and it has three callers.

**D2 — the types live in `Provenance.shapes.ts`.** The module's existing shapes file, holding the same
kind of slice, with a docblock that already states the principle. Prefer editing an existing file.

**D4 — corrected at the start of Phase 3: `CollectionSlug` stays, and the factory type moves.**

The criterion first read "imports no type from `payload`". Two things make that the wrong target, and
saying so now is cheaper than discovering it at grading:

- **`CollectionSlug` is not a god type.** It is a union of the host's collection slugs — effectively a
  checked `string`. Replacing it with `string` would lose call-site safety and buy nothing; the thing
  the owner objects to is the `Payload` instance, not the package.
- **`ProvenanceServiceFactory` legitimately names `Payload`** — it *is* the adapter boundary, and its
  consumers pass `req.payload`. It does not belong in a file that is meant to be Payload-free, so it
  moves to `Provenance.wiring.ts`, which is where the factory is actually produced. All five consumers
  import it through the module barrel, so the move is invisible to them.

So the criterion is now about the **class**, not the file's import list.

**D3 — the bound read keeps today's arguments exactly, including what it omits.**
The current call passes `{ payload, collection, id, locale, user }` and **not** `scope`, while every
store write does thread `scope`. That asymmetry is pre-existing; this refactor preserves it rather
than silently changing behaviour. See Risk Notes.

### Placement

| piece | lands in | why |
|---|---|---|
| `ProvenanceLogger` slice | `Provenance.shapes.ts` | the module's existing narrow-slice file |
| `SourceDocumentReader` function type | `Provenance.shapes.ts` | same file; it is the other half of the same seam |
| binding `payload.logger` and `fetchSourceDocument` | `Provenance.wiring.ts:58` | the factory is already the Payload-aware adapter |

### New surface

Two types. Callers: `Provenance.service.ts` (consumer), `Provenance.wiring.ts` (producer), and the
service's tests. Two production call sites, which clears the bar.

### Written contract

One, inherited rather than new: the bound read answers `null` for *not available to this caller*, and
deliberately does not distinguish refused from absent — `fetchSourceDocument`'s own documented
contract. The type's docblock must say so, or a reader of the service will take `null` for "no such
document".

### Escalate?

**No.** One module, no new pattern, no dependency, no data-model change, and the placement is dictated
by an existing convention in the same directory.

---

## Acceptance criteria

| # | Criterion | Declared check | Pre-flight |
|---|---|---|---|
| 1 | The `ProvenanceService` class does not touch the `Payload` god type — not in a field, a constructor parameter, or a method body | `grep -c "\bPayload\b"` in the file → 0; `check-types` clean | **fails now** |
| 2 | The service's tests build it with plain literals, with no `as unknown as Payload` | `grep -c "as unknown as Payload"` → 0 in that file | **fails now** (1 cast) |
| 3 | Behaviour is unchanged: every existing case in the provenance module still passes, with only construction updated and no expectation rewritten | `bunx vitest run src/server/modules/provenance` → 72; plus a read of the test diff | **passes now** (72) |
| 4 | The wiring hands over `payload.logger` directly, with no adapter object | reading `Provenance.wiring.ts`; `check-types` clean | fails now (no such call) |
| 5 | The bound read passes exactly what the call passes today — `collection`, `id`, `locale`, `user`, and **no** `scope` | reading the bound call against `Provenance.service.ts:267-273` as it stands | fails now (not bound yet) |
| 6 | Package baselines hold: unit **1929**, `check-types` clean, `oxlint` **55 warnings / 0 errors** | the three commands, output quoted | **passes now** |
| 7 | Integration unchanged on all three adapters: SQLite **178**, PostgreSQL **184**, MongoDB **177** | `bun run build`, then the three suites | **passes now** |

**Outcomes are three: met · not met · not verified.** A criterion whose declared check could not be
run is recorded `not-verified`, never `met` via a weaker proxy.

---

## Risk Notes

- **The `scope` asymmetry (D3).** The staleness recompute reads the source *without* the caller's
  transaction, while provenance writes thread it. Pre-existing, preserved here, and now easier to see
  because the read becomes an explicit bound dependency. Worth its own look later; changing it in a
  refactor that claims no behaviour change would be dishonest.
- **The logger slice must stay as narrow as the calls.** All four sites pass a single object
  (`{ err, collection, documentId?, targetLocale?, sourceLocale?, msg }`). If the slice grows a second
  method nobody calls, it stops being the thing this task is for.
- **A refactor with no behaviour change is graded by its tests.** The guard is that no expectation in
  the existing 72 may change — only how the service is constructed. A diff that rewrites assertions is
  the failure mode here, and criterion 3 names it.

## Human choices

- **`fetchSourceDocument` is not removed, and not narrowed.** The owner asked whether to drop it; the
  answer is no. Three callers, and it holds two settled decisions (`enforcedAtTheRead` from the
  read-rules work; `{ draft: true, fallbackLocale: false }` from "take the source from the locale's own
  current version"). Its own docblock states why it must be the single read: *"or the fingerprints they
  compare drift apart."* Inlining it would copy both decisions into three places and remove the guard
  against exactly the drift the previous task spent a day chasing.
- **The service is not moved to `core`.** This refactor opens that seam — once Payload is gone, the
  class is portable, and the rest of the fingerprint policy (`staleness.ts`, `SourceFingerprint.ts`)
  already lives there. Deliberately out of scope; a separate conversation.
- **The 35 dead re-exports in `core/index.ts` stay.** They are the surface of the unfinished
  `@repo/translator-core` extraction, not carelessness. Untouched by decision.

## Review log

(appended by review passes)

### Comment audit — 2026-10-05

This work's eight files were judged in the pipeline-and-server slice. The audit's payload here was
structural, not prose:

- `ProvenanceService.readFingerprint` → `readFingerprintOrThrow`. The class carried three separate
  docblocks circling one rule — that only `record` may see a read failure rather than a `null`. Two
  are deleted; the name states it.
- `provenanceIo` now passes `scope: OUTSIDE_THE_CALLERS_TRANSACTION`. The omission of `scope` was
  deliberate and preserved from before this refactor, but a five-key destructure against a six-key
  target is the shape a reader silently "fixes".
- `Provenance.shapes.ts` lost two restatements of the structural-typing convention; it is stated
  once, at the top of the file, and the package `CLAUDE.md` already rules on it. The paragraph
  defending `CollectionSlug` was an answer to a reviewer and is gone.

Rejected: widening `lastTranslatedFrom`'s return so the swallow's `undefined` stays distinct from
`null` — see the rejected-verdicts note in the per-field-fingerprints contract.
