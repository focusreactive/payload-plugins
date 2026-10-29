# The document asks before it writes

## Task restatement

`translate-document/handler.ts` holds three unrelated jobs: it runs the translation, and it
also knows who the requester is, what the collection's rules say about them, and how to write
the document. The owner wants the second and third out of the handler, and wants the check to
be **impossible to forget, move, or quietly re-condition** — enforced by the contract rather
than by test coverage.

Extract the requester identity, the permission condition and both document writes into one
unit built once per run: the target document as this requester sees it. The handler then reads
and writes through it and never names a permission.

**No behaviour changes.** The same three questions are asked, about the same data, in the same
order, and Payload receives the same arguments.

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| platform (Payload) | `overrideAccess: false` + `user` on the write already makes Payload apply the collection's rules (`enforcedAtTheWrite`, `handler.ts:55-60`) | **already used.** The explicit pre-check is not what makes the write safe; it decides *when* the refusal lands — before the provider is paid, and before a `Forbidden` inside the editor's transaction kills their save (`enforcedAtTheRead.ts:5-8`) |
| platform | `docAccessOperation` — Payload's own evaluator, the one behind `/api/<slug>/access` | **already used**, `translationPermission.ts:53` |
| project | `Requester` — brand + sole constructor, `RequestScope.shapes.ts:14-34`, with the stated reason *"so it can never drift"* | **adopted as the precedent** for the approval brand |
| project | `IdPath` — same idiom, `idPath.ts:22`, minted at `idPath.ts:77` | same |
| project | `TargetLayer` — a union whose dangerous combination is unbuildable, `targetLayer.ts:17-34` | **constrains the design**: the new write surface must not reintroduce those states as an options bag |
| project | `fetchSourceDocument`, `enforcedAtTheRead`, `freshReq` | moved, not rewritten |

Nothing new is installed. The one new concept is the approval brand, below.

## Decisions

### D1 — one unit holding identity, condition and both writes

**Chosen:** a new `translate-document/targetDocument.ts`, opened once in `beginRun` from
`payload + target + scope`, which rebuilds the requester, reads both locales, and performs both
writes.

**Rejected — extract only the writer, leave the reads in the handler.** The handler would still
import `enforcedAtTheRead`, `fetchSourceDocument` and `freshReq`, and would still have to hold
`requester` to pass to the read. The requester would then live in two places, which is the thing
the extraction exists to stop.

**Rejected — a port in `core/` with a Payload adapter in `server/`.** One implementation, one
caller. The task brakes forbid an abstraction without two real callers, and there is no second.

**Constraint cited:** `run.requester` has exactly five readers today — `handler.ts:210` (source
read), `:220` (target read), `:244` (`permissionQuery`), `:335` (`refuseUnlessWriteAllowed`),
and `:64` via `writingTo` — and every one of them is a read or a write of this one document.
Nothing else in the file touches it.

**Honest note on reuse:** the new unit has **one** caller. It is a relocation driven by a stated
requirement, not a shared abstraction, and it is not exported from any barrel.

### D2 — the approval is a branded value, not a remembered step

**Chosen:** `ApprovedWrite` — a branded payload minted only by `approveWrite()` in
`translationPermission.ts`, which asks the collection's rules and throws `TranslationRefused`
on a refusal. The private write inside `targetDocument.ts` demands an `ApprovedWrite`, so the
only way to reach a write is through the ask.

**Rejected — fold the check into the write method and rely on the file being small.** Nothing
then stops a third write added later from skipping it, which is precisely the failure the owner
asked to make impossible.

**Rejected — a decorator around `handle`, or a check lifted to the caller.** Settled in
conversation: two of the three checks ask about data that does not exist until mid-run, because
the collection's rule reads `data` (`translationPermission.ts:99-102`).

**Constraint cited:** `Requester` (`RequestScope.shapes.ts:14-34`) is this package's own answer
to the same problem — a brand plus a sole constructor, so every producer has to come through one
place. The cast at the minting site is that idiom, not a silenced type error.

**Residual, deliberate:** `run.payload` stays on the handler's `Run` for the module seam, the
logger and nothing else, so `run.payload.update(...)` remains *writable* by hand. Closing it
means narrowing `Run.payload` to a shape without `update`, which the module seam forbids —
`moduleSeam` hands modules the full `Payload` (`TranslationRun.interface.ts`). Not fixed here.

### D3 — no options bag on the write

**Chosen:** the document exposes `saveTranslation(data, write)` and `publish(scope)`, each taking
exactly the shape its call site already holds — `TargetLayer["write"]` and `PublishScope`.

**Rejected — one `write(data, options)` with an options bag.** A flat bag of optional fields
would admit `{ draft: true, publishSpecificLocale }` on a collection with no drafts, which
`targetLayer.ts:17-23` deliberately made unbuildable and `targetLayer.contract.test.ts` pins.
Reintroducing it as optional fields would give back a guarantee the project already paid for.

**Constraint cited:** `targetLayer.ts:17-23` and its contract test.

### D2a — amended in Phase 3: the brand is minted in `targetDocument.ts`, not in `translationPermission.ts`

D2 placed `approveWrite` beside the condition it asks. Building it there broke one check, and the
break was not cosmetic: `handler.access.test.ts:112` pins that the **write-time** ask is handed the
real requester rather than `null`, and it does so by asserting on `mayWrite`, which it mocks by
module path. A function calling its own module sibling cannot be intercepted that way, so minting
inside `translationPermission.ts` would have forced that assertion to be rewritten — spending the
evidence that this task changes no behaviour.

`approveWrite` therefore lives in `targetDocument.ts` and calls `mayWrite` across the module edge,
exactly as `handler.ts` did. Forging the brand still takes a cast either way, so the guarantee is
unchanged; what moved is only where the legitimate mint sits.

**The cost, named:** "nobody to ask about → allowed" is now expressed twice in `targetDocument.ts` —
once inside `checkTranslationPermission` for the pre-provider ask, once as an explicit `if (requester)`
for the write. That duplication is what `handler.ts` already had; it is preserved, not introduced,
and collapsing it is a separate change with a test assertion to re-earn.

### D3a — `PermissionQuery` goes back to being module-private

The previous contract exported it for `handler.ts`'s `permissionQuery`. That consumer is gone, the
regression sweep found no other, and the package rule is that a name is exported for a consumer that
exists. Reverted to a plain `type`.

### D4 — the pre-provider check stays a visible step

**Chosen:** `handle` keeps one line, `doc.refuseUnlessTranslationAllowed(sourceData)`, before the
provider call.

**Rejected — fold it into `readBothLocales` so it cannot be forgotten either.** It would be
unforgettable, but a reader running their eye down `handle` would no longer see that a permission
is asked, and the owner's last task on this file was spent making that list legible. The stakes
differ from the write checks: forgetting this one costs a provider call, not an editor's save.

**This decision is the gate question.**

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | `handler.ts` performs no Payload write | `grep -c 'payload\.update' src/server/features/translate-document/handler.ts` | `0` |
| AC2 | `handler.ts` names no permission and no read-enforcement helper | `grep -cE 'translationPermission\.js\|enforcedAtTheRead\.js\|sourceDocument\.js' .../handler.ts` | `0` |
| AC3 | `handler.ts` raises no refusal of its own | `grep -c 'new TranslationRefused' .../handler.ts` | `0` |
| AC4 | A payload nobody asked about cannot be made into an `ApprovedWrite` — a compile error, not a review catch | a `@ts-expect-error` check in `__tests__/targetDocument.contract.test.ts` passing a plain object where `ApprovedWrite` is demanded; `bun run check-types` | exit 0 with the check present, and **non-zero when the `@ts-expect-error` line is deleted** (the mutation) |
| AC5 | The condition lives in one file | every `mayWrite(` call site outside `__tests__` is in `translationPermission.ts` | true |
| AC6 | Behaviour is unchanged — the nine existing suites still pin it, with no assertion rewritten | `bunx vitest run src/server/features/translate-document/__tests__/`, then `git diff -U0 -- .../__tests__/ \| grep -c '^[-+].*expect('` | 95 passed; **0** changed assertion lines |
| AC7 | The three checks still ask about the same data in the same order | `handler.access.test.ts` and `handler.spend.test.ts` green **unmodified** apart from mock targets | exit 0 |
| AC8 | Payload still receives the same write arguments | `handler.enforce.test.ts` and `handler.transaction.test.ts` green | exit 0 |
| AC9 | Access control still holds end-to-end | rebuild, then from `apps/dev`: `bun run test:integration` | 225 passed / 8 skipped |
| AC10 | No new type errors | `bun run check-types` in the package and in `apps/dev` | `0` each |
| AC11 | No new analyzer findings | `sp-lint-delta.sh -- bunx oxlint .` | nothing introduced |
| AC12 | The build still emits declarations | `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root | exit 0 |
| AC13 | `handler.ts` is shorter than 310 lines | `wc -l` | ≤ 310 (arithmetic in Risk notes; **report the real number**) |

## Pre-flight

| AC | Command | Result now | Kind |
|---|---|---|---|
| AC1 | `grep -c 'payload\.update' handler.ts` | **2** | must change — fails now ✓ |
| AC2 | `grep -cE '…Permission\|…AtTheRead\|sourceDocument'` | **5** | must change — fails now ✓ |
| AC3 | `grep -c 'new TranslationRefused'` | **2** | must change — fails now ✓ |
| AC4 | `grep -rc 'ts-expect-error' __tests__/` | **0 files** | must change — fails now ✓ |
| AC5 | `mayWrite(` outside tests | **3 sites, two of them in `handler.ts`** | must change — fails now ✓ |
| AC6 | `bunx vitest run .../translate-document/__tests__/` | **9 files / 95 passed** | invariant — passes now ✓ |
| AC10 | `bun run check-types` | **0** | invariant — passes now ✓ |
| AC13 | `wc -l handler.ts` | **365** | must change — fails now ✓ |
| AC9, AC11, AC12 | integration / lint / build | taken from the run that closed `2026-10-25-one-run-one-context.task.md` this session: 225 passed / 8 skipped · 43 warnings, 0 errors · build green | invariant — passed then; re-run in Phase 5 |

## Risk notes

- **High risk, and the classification binds.** The change moves access-control code. Behaviour
  must be identical, and the evidence for that is the nine unit suites plus the eight
  `access-control-*` / `read-access-*` integration suites in `apps/dev`, which run against a real
  Payload. Phase 4's regression sweep is mandatory and evidenced; Phase 5b runs three review
  angles.
- **Three unit suites mock `../translationPermission.js` by path** (`handler.access`,
  `handler.enforce`, `handler.spend`). The new file imports from that same module, so the mocks
  keep intercepting — but if a mock has to be re-pointed, that is setup, not an assertion, and
  AC6 counts only assertion lines.
- **AC13's arithmetic**, so the number is not a guess: leaving `handler.ts` are `readBothLocales`
  (28), `refuseUnlessTranslationAllowed` (4), `permissionQuery` (12), `refuseUnlessWriteAllowed`
  (12 incl. docblock), `saveTranslatedDocument` (9), the publish write (7), `writingTo` (7),
  `enforcedAtTheWrite` (11 incl. docblock) and 8 import lines — about 98 out, about 12 back for
  the `doc` field and the four call sites. 365 − 86 ≈ 280, so 310 carries headroom. The previous
  contract on this file (`2026-10-25-one-run-one-context.task.md`, AC4) failed because its number
  came from an estimate with no arithmetic behind it; this one is recorded as a measurement to
  report, not a target to hit.
- **Not in scope:** the residual in D1 (`run.payload.update` remains hand-writable); the
  unguarded `payload.collections[input.collection]` index at `handler.ts:182`, which is older
  than this task and whose fix is a behaviour change.

## Human choices

**2026-10-25, at the gate.**

1. *"Клеймо на проверенных данных (рекомендую)"* — D2 is in scope for this task. The write is
   closed at the type level, not by the file being small.
2. *"Видимым шагом (рекомендую)"* — D4 stands: the pre-provider check keeps its own line in
   `handle`. Forgetting it costs a provider call, not an editor's save, and the step list stays
   legible.

Earlier in the same conversation, before the contract existed:

3. A decorator around `handle`, and lifting the check to the caller, were both proposed by the
   owner and withdrawn once it was shown that two of the three checks ask about data that does
   not exist until mid-run.
4. *"Мне не нравится что управление разрешениями зашито прямо в хэндлер"* — the requirement
   behind D1.

## Result — every criterion walked with its declared check

| AC | Declared check | Evidence | Verdict |
|---|---|---|---|
| AC1 | `grep -c 'payload\.update' handler.ts` | `0` (was 2) | met |
| AC2 | `grep -cE` the three permission/read modules in `handler.ts` | `0` (was 5) | met |
| AC3 | `grep -c 'new TranslationRefused' handler.ts` | `0` (was 2) | met |
| AC4 | the type check in `__tests__/targetDocument.contract.test.ts` + `check-types` | passes; **mutation A** (brand removed) → 2 type errors; **mutation B** (string brand restored) → the forgery check fails alone | met |
| AC5 | every `mayWrite(` call site outside tests in `translationPermission.ts` | two sites: `translationPermission.ts:154`, `targetDocument.ts:93` | **NOT MET** — see above; the criterion was superseded by D2a and is reported failed rather than rewritten |
| AC6 | the nine suites green, 0 changed assertion lines | 97 passed (95 pre-existing + 2 new); **no existing test file was written at all** — mtimes show all nine unchanged since before this task | met |
| AC7 | `handler.access` + `handler.spend` green unmodified | green, byte-unmodified | met |
| AC8 | `handler.enforce` + `handler.transaction` green | green, byte-unmodified | met |
| AC9 | `bun run test:integration` from `apps/dev` after a rebuild | **225 passed / 8 skipped**, unchanged | met |
| AC10 | `check-types` in the package and in `apps/dev` | `0` and `0` | met |
| AC11 | `sp-lint-delta.sh -- bunx oxlint .` | `mode=two-run`, nothing introduced; 43 warnings / 0 errors, unchanged | met |
| AC12 | `turbo run build` for the package | exit 0 | met |
| AC13 | `wc -l handler.ts` | **251** (was 365), against a ceiling of 310 | met |

Package suite: **190 files / 2485 checks**. The brief carried 2482 as the baseline; measured by
excluding only the new file, the baseline is **2483**, so this task adds exactly the 2 checks it
wrote. The brief's number was one stale.

`sp-diff-checks.sh`: three `test-integrity` rows, all on files this task did not touch
(`provenance.int.test.ts`, `chainOrder.test.ts`, `Provenance.module.test.ts`) — they belong to
earlier work on this branch. Reviewed diff pinned at `a55cf098a83d`.

## Review log

### 2026-10-25 — comment audit (9 blocks, 8 candidates; one block held two comments)

DELETE 1 · REWRITE-CODE 2 · REWRITE-COMMENT 6 · KEEP 0. Every verdict applied. Two findings were
substantive rather than stylistic:

- **`WriteDestination` did not do what its docblock claimed.** An untagged union does not stop a
  literal mixing both members, and a probe confirmed that
  `{ locale, fallbackLocale, draft: true, autosave: false, publishSpecificLocale }` compiled. Fixed
  in code with `?: never` on each member's foreign keys; the docblock was then unnecessary and was
  deleted.
- **Two comments of mine restated an overclaim I had already fixed elsewhere** — the test's docblock
  and its directive both said "a payload nobody asked about is not an `ApprovedWrite`", which is
  false when there is no requester, because `approveWrite` then mints one without asking. The test
  was rewritten as a type assertion (`expectTypeOf(...).not.toExtend<ApprovedWrite>()`), which
  needed no prose at all.

The comment moved verbatim from `handler.ts` onto `enforcedAtTheWrite` also had to be rewritten:
"it does not throw, so this is safe" is true of Payload's *field* rules and false of the
collection's `update` rule, which does throw `Forbidden` — the very reason `approveWrite` exists.
Next to `approveWrite` the two statements contradicted each other.

### 2026-10-25 — three review angles (high risk)

**Behaviour equivalence — no findings.** Reads, both writes, the spread order inside the update
arguments, the three permission asks, `beginRun`'s ordering, and the error types and their order
were each compared against `handler.ts` as it was. No difference found.

**Attacking the guarantee — one real defect, fixed.** The brand was
`Record<string, unknown> & { readonly __brand: "ApprovedWrite" }`, and a string brand is a public
name: `{ title: "x", __brand: "ApprovedWrite" }` type-checked with **no assertion at all**, so the
write was reachable without asking. Replaced with a `unique symbol` key the module never exports,
and a second check pins the forgery. Two mutations prove both checks discriminate: removing the
brand fails `check-types` twice, and restoring the string brand fails the forgery check alone.

**Shape — no change made.** The four exported names each have a consumer; nothing captured by the
closure is unused or mutable; no per-run state reaches the handler instance; every `Run` field has
a reader. Two notes are carried below rather than fixed.

### AC5 is NOT MET as written, and the criterion is left standing rather than reshaped

AC5 says every `mayWrite(` call site outside `__tests__` is in `translationPermission.ts`. After the
D2a amendment there are two: `translationPermission.ts:154` and `targetDocument.ts:83`. The
criterion was written against D2's original placement and D2a moved it, for a reason recorded with
its evidence — so the criterion is wrong, not the code, and it is reported failed rather than
quietly rewritten to match what was built.

What is true, measured: the condition itself — the one function that evaluates the collection's
rules — is in `translationPermission.ts`, and **no call site is in `handler.ts`**, which is what the
owner asked for.

## Residuals and follow-ups — recorded, not fixed here

1. **The module seam is a second route past the approval.** `moduleSeam` hands every chain module
   the full `Payload` (`handler.ts:34-38`), so a module — including a host's own — can write the
   target document with nothing asked. This is the same class as the residual D1 records, but worth
   stating separately: modules are a published extension point, not just this file.
2. **The target-locale read duplicates `fetchSourceDocument`.** `targetDocument.ts`'s second read
   sends that helper's exact argument set by hand, which is the drift its own docblock warns about
   (`sourceDocument.ts:22-28`). Switching to it would also drop the `enforcedAtTheRead` import here.
   **Deferred deliberately:** the helper's `id` is a `string`, so the call would pass
   `String(documentId)` where the read passes `documentId` today. That is a behaviour change, however
   small, and this task promised none. It is the recommended next step.
3. **`Requester` and `IdPath` carry the same forgeable string brand** this task has just replaced on
   `ApprovedWrite`, and `Requester` is exported from `src/index.ts`. A consumer can write
   `{ userId, userCollection, __brand: "Requester" }` with no assertion. Separate task; it touches
   the published surface.
4. **`permissionQuery` sets `user` and the write ask overrides it** with the narrowed non-null value
   (`targetDocument.ts:83`). It reads as though the two could differ; they cannot. This is the shape
   `handler.ts` already had — see D2a — and is left alone.
