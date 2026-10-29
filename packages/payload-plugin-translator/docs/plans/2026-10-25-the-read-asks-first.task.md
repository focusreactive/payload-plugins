Build step: 2026-10-25-the-run-as-a-list.design.md #1

## Task restatement

Today `TargetDocument` offers two separate calls — read both locales, then ask the collection's
rules about the source — and `handler.ts:119-120` makes them in that order. Nothing but a test keeps
the ask before the provider is paid, and nothing stops a future reader of the source from skipping
it entirely.

Merge them into one call that returns a value only it can produce, and make every step that carries
the source onward demand that value. Then "the provider was paid before anyone asked" stops being a
convention and becomes a compile error.

Covers **R1** and **R5** of the design. The class, `model.ts`, the module seam and the four parked
concerns are **not** touched — those are steps 2, 3 and 4.

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| project | `ApprovedWrite` in the same file: a brand on a type-only `declare const asked: unique symbol`, minted by one `as ApprovedWrite`, demanded by the file's single `payload.update` | **the mechanism, already proven here.** Copied in shape, not in its minting |
| project | `Requester` (`RequestScope.shapes.ts:14-34`) and `IdPath` (`idPath.ts:22`) — brand plus sole constructor | same idiom, two more precedents |
| platform (TypeScript) | `const x: unique symbol = Symbol("…")` is a **runtime** symbol, so an object literal with that computed key carries it in its inferred type — no assertion at the minting site | **this is the new part**, and it is what keeps the owner's "no assertions" rule |
| platform (tsc) | a non-exported `unique symbol` referenced by an exported type survives declaration emit — the shipped `dist/.../targetDocument.d.ts:16-18` already carries `declare const asked: unique symbol;` beside the exported `ApprovedWrite` | the `.d.ts` risk the design flagged is **answered for the type-only form**; the runtime form still has to be proven by AC5 |

Nothing new is installed.

## Decisions

### D1 — `ApprovedSource` is a standalone shape; `BothLocales` is deleted, not hidden

**Chosen:** declare the two fields inline on `ApprovedSource` and remove `BothLocales` entirely.

**Rejected — keep `BothLocales` and write `ApprovedSource = BothLocales & { readonly [s]: true }`.**
The design says `BothLocales` stops being exported. But an exported alias that references a
non-exported local alias is the classic declaration-emit failure, and this step is explicitly
required to pass the real `tsc` build. Keeping it exported to dodge that would leave a name with no
consumer, which the package's own export rule forbids.

**Constraint cited:** `handler.ts:28,221` is the only importer of `BothLocales` in `src/`, and it
needs the approved type there anyway — so after this change the name has zero consumers.

### D2 — the minting symbol is its own, and the write brand is not touched

**Chosen:** a second, separate symbol for the source.

**Rejected — reuse `asked`.** `BothLocales` is a type alias and so receives an implicit index
signature; `BothLocales & { readonly [asked]: true }` would therefore satisfy `ApprovedWrite`, and a
value approved only for reading would be accepted where a write payload is demanded. That silently
weakens the guarantee step 1 is meant to extend, not erode.

**Constraint cited:** `sendToPayload`'s `data: ApprovedWrite` parameter is the single write path;
anything assignable to it can be written.

### D3 — the mint uses a runtime symbol so no assertion is needed

**Chosen:** `const approvedSource: unique symbol = Symbol("approvedSource")`, and the minting
function carries an explicit `Promise<ApprovedSource>` return type.

**Rejected — `return value as ApprovedSource`,** matching `approveWrite`'s existing cast. The owner's
rule forbids assertions that silence the checker, and here one is avoidable. `approveWrite` keeps
its cast because its brand sits on the object handed to Payload as `data`, where a real symbol key
would be copied into written data; `ApprovedSource` is a wrapper that is never sent anywhere.

**The condition, recorded because it is silent when missed:** without the explicit return type,
`[approvedSource]: true` widens to `boolean` and stops satisfying `readonly [approvedSource]: true`,
and the assertion comes back. AC9 is what catches that.

### D4 — which steps demand the approved value

**This is the gate question.** The design says narrowing, the module chain and the provider call all
take it. The narrower alternative is to require it only at the provider call, which is the only step
that spends money and the only one R1 names.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | No read that skips the decision survives | `grep -c 'readBothLocales\|refuseUnlessTranslationAllowed' targetDocument.ts handler.ts` | `0` in both (now 4 and 2) |
| AC2 | R1, R5 | A source nobody asked about cannot be made into an `ApprovedSource` | a type assertion in `__tests__/targetDocument.contract.test.ts`; `bun run check-types` | exit 0 with it present, **non-zero when the brand is removed** (the mutation) |
| AC3 | R1 | The write guarantee is not weakened: an `ApprovedSource` is not an `ApprovedWrite` | a second type assertion in the same file | exit 0; **non-zero when the two brands share one symbol** (the mutation) |
| AC4 | R8 | Behaviour is unchanged — the ten existing suites still pin it | `bunx vitest run src/server/features/translate-document/__tests__/`, then count changed assertion lines in those files | 97 passed; **0** changed assertion lines |
| AC5 | — | The real declaration build passes, not only `tsgo` | `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root | exit 0, and `dist/.../targetDocument.d.ts` carries the runtime symbol |
| AC6 | — | No new type errors | `bun run check-types` in the package and in `apps/dev` | `0` each |
| AC7 | — | No new analyzer findings | `sp-lint-delta.sh -- bunx oxlint .` | nothing introduced |
| AC8 | R1 | Access control still holds end to end | rebuild, then from `apps/dev`: `bun run test:integration` | 225 passed / 8 skipped |
| AC9 | R5 | The mint needs no assertion | `grep -rc 'as ApprovedSource' src/` | `0`; and `as ApprovedWrite` stays at exactly `1` |

## Pre-flight

| AC | Command | Result now | Kind |
|---|---|---|---|
| AC1 | the grep | **4** in `targetDocument.ts`, **2** in `handler.ts` | must change — fails now ✓ |
| AC2, AC3 | the type assertions | `ApprovedSource` does not exist, so the test cannot compile | must change — fails now ✓ |
| AC4 | the feature suite | **10 files / 97 passed** | invariant — passes now ✓ |
| AC6 | `check-types` | **0** | invariant — passes now ✓ |
| AC9 | `as ApprovedSource` / `as ApprovedWrite` | **0** and **1** | invariant — passes now ✓ |
| AC5, AC7, AC8 | build / lint / integration | taken from the run that closed `2026-10-25-the-document-asks-before-it-writes.task.md`: build green · 43 warnings, 0 errors · 225 passed / 8 skipped | invariant — passed then; re-run in Phase 5 |

## Risk notes

- **High risk, and it binds.** The change rearranges the access decision on the path that spends
  money and writes a document. A test is required, the regression sweep is evidenced, and Phase 5b
  runs several review angles rather than one.
- **The declaration-emit risk is real but bounded.** The type-only form is already proven in the
  shipped `dist`; the runtime form is not, and AC5 exists to prove it rather than assume it. If the
  real build fails, D3 falls back to the assertion and that is a finding to report, not to paper
  over.
- **The ask moves inside a call.** After this step a reader of `handle` sees `readSourceIfAllowed`
  rather than a separate line saying a permission is asked. That trade was reopened by the owner and
  settled in the design (ADR D2); it is recorded here so a later reviewer does not re-raise it.
- **Not in scope:** the module seam can still write the target document unasked (design D6, carried
  to its Open questions); the class, `model.ts` and the four parked concerns (steps 2 and 3).

## Human choices

**2026-10-25, at the gate.** *"Все три — как в проекте"* — D4 resolves to the design's own answer:
`leavesToSend`, `runModulesBefore` and `translateOrWrap` each demand `ApprovedSource`, not a bare
source record. Two of the three read only `sourceData`, so the parameter is wider than what they
touch; that is accepted deliberately, because what their answer depends on is **that the source was
asked about**, and the proof travels on the wrapper. The narrower alternative — the brand only at
the provider call — was offered and declined.

The two decisions above it (D1 delete `BothLocales`, D2 a separate symbol) were taken without a
question because both are forced: the first by declaration emit, the second by the write brand's
assignability.

## Result — every criterion walked with its declared check

| AC | Evidence | Verdict |
|---|---|---|
| AC1 | `readBothLocales` / `refuseUnlessTranslationAllowed`: **0** in `targetDocument.ts` (was 4), **0** in `handler.ts` (was 2) | met |
| AC2 | the type check passes; **mutation**: removing the brand fails `check-types` on that case alone | met |
| AC3 | the second type check passes; **mutation**: giving both brands one symbol fails that case *and* breaks the mint itself | met |
| AC4 | 10 files / **99 passed** (was 97; +2 are the new type checks). **0** changed assertion lines, and only one test file was written to at all — by addition | met |
| AC5 | `turbo run build` exit 0; `dist/.../targetDocument.d.ts:5` carries `declare const approvedSource: unique symbol;` beside the exported type | met |
| AC6 | `check-types` 0 in the package, 0 in `apps/dev` | met |
| AC7 | `sp-lint-delta` `mode=two-run`: nothing introduced; 43 warnings / 0 errors, unchanged | met |
| AC8 | `bun run test:integration`: **225 passed / 8 skipped**, unchanged | met |
| AC9 | `as ApprovedSource`: **0**. `as ApprovedWrite`: **1**, the pre-existing one | met |

`sp-diff-checks`: clean, 5 checks, no findings.

## Review log

### 2026-10-25 — comment audit (3 candidates, 4 verdicts)

REWRITE-COMMENT 1 · DELETE 1 · KEEP 2. Both verdicts applied.

The `ApprovedSource` docblock said the value carries *"the proof that the collection's rules were
asked about this source — or asked nothing, when there is no requester"*, which contradicts itself:
a value that can be minted with no ask proves the gate was passed, not that an ask happened. It also
said "the collection's rules" where the fact that matters is narrower — the `update` rule, evaluated
with `sourceData` rather than with the payload a write would send. That narrower statement is
exactly what explains why this brand must never satisfy `ApprovedWrite`, so naming it made the test's
inline comment unnecessary, and that comment was deleted in favour of renaming the case.

The two pre-existing docblocks in the file (`approveWrite`, `enforcedAtTheWrite`) were checked for
staleness caused by the merge and are not stale: both describe the write path, which this change
does not touch.

### 2026-10-25 — three review angles (high risk)

**Behaviour equivalence — no findings.** Both reads still carry the same arguments inside one
`Promise.all`; the two `SourceUnreadable` checks still precede the ask; the ask is still
`checkTranslationPermission(permissionQuery(sourceData))` and still runs before narrowing, before
any module and before the provider; all three rewired methods read the same fields they read before.

**Shape — no defects.** `BothLocales` has zero references left. Nothing is orphaned;
`permissionQuery` still serves both the read and the write. The two brands use different mechanisms
for a stated reason and should stay that way.

**Attacking the guarantee — one finding worth recording, no change made.**

A deliberate `{ ...approved, sourceData: somethingElse }` **compiles**: the brand is an own
enumerable property, so a spread copies it, and the result vouches for data nobody asked about. The
brand therefore attests that the value *came from the read*, not that its fields are the ones that
were checked. Nothing in this change spreads an `ApprovedSource` — the handler only reads
`.sourceData` and `.currentTarget` — so this takes a future, deliberate edit, and it is visible in
review. Closing it would mean hiding the fields behind accessors on a class with a `#private`
member, which is heavier than the thing it protects and is not the package's idiom anywhere else.
Recorded rather than fixed. The same weakness applies to `ApprovedWrite` and predates this work.

Independently confirmed, and already recorded as Open question 3 of the design: `translate-field`
reads a source and pays a provider **without ever asking the `update` rule** — it checks only the
collection's `read` rule through `fetchSourceDocument`. The guarantee this step establishes covers
`translate-document` only. Nothing in the types says so.
