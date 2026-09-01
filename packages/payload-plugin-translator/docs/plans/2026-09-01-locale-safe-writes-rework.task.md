# Task contract — separate translating from publishing

Implements [2026-09-01-locale-safe-writes-rework.md](./2026-09-01-locale-safe-writes-rework.md)
on top of the uncommitted PR #117 diff, on `feat/translator-locale-safe-writes-rework`.

**Risk: HIGH.** Writes data, changes publish state, reached by two consumers (the enqueue
route and the auto-translate hook), and this exact code produced three data-loss
regressions during the previous round.

## Restatement

`publish_on_translation` currently does three jobs: it picks the layer the target is read
from, it changes the data of the translation write, and it changes that write's arguments.
Split them. Translation always writes to the draft layer; publishing becomes a second
write that the flag alone gates. External behaviour and the endpoint contract are
unchanged.

## Design decisions

**D1 — publishing is a separate write, not an argument of the translation write.**
Rejected: PR #117's single write plus a carry to keep it non-empty — three moving parts in
three files that still miss the case where both layers agree.
Constraint: measured — `data: { _status: "published" }` + `publishSpecificLocale` publishes
the locale's current content with no translated payload (recon/empty-publish-write.txt).

**D2 — the translation is based on the current version** (`findByID({ draft: true })`) and
always writes to the draft layer.
Rejected: PR #117's per-mode layer choice, which exists only to stop a publish carrying
draft content live — now the intended behaviour.
Constraint: measured — `draft: true` returns the newer draft when one exists, else the
published row (recon/current-version-model.txt, P1).

**D3 — `TargetLayer` becomes two variants**, `no-drafts` and `drafts`, with `publish`
present only on `drafts`.
Rejected: three variants — correct for the single-write design, where the flag was the
discriminant; it no longer is.
Constraint: measured — `publishSpecificLocale` on a versions-without-drafts collection
silently drops every other locale from the live row.

**D4 — the six `core/translation-pipeline/` files revert to `main`.**
Rejected: hand-editing them. `main` already passes `ctx.targetData` to the collector, so a
revert is exact and reviewable. Re-apply only the two comment deletions from the audit that
were independent of the carry.

**Placement:** all behaviour change in `server/features/translate-document/`. `core/`
reverts. No new module.

**New surface:** none. Two contracts are *removed* (`existingTranslation` and
`hasCarriedValues` on `PipelineConfig` / `PipelineContext`).

**Written contract owed:** `resolveTargetLayer` already has one, in
`targetLayer.contract.test.ts`; it is updated, not replaced.

**Escalate to architecture:** no. Single module, no new seam, reverting to a shape that
already exists.

## Acceptance criteria

1. **Publish with nothing to translate publishes.** Document unpublished, `de` already
   fully translated, `skip_existing` + `publish_on_translation: true` → document becomes
   `published` and the live `de` value is the existing translation. (Currently fails —
   recon/publish-flag-ignored.txt case B.)
2. **Publish with an empty source publishes.** Source has no translatable content,
   `publish_on_translation: true` → document becomes `published`. (Currently fails — case A.)
3. **Draft mode with nothing to translate writes nothing.** `updatedAt` and `_status`
   unchanged.
4. **A colleague's pending draft edit survives a draft-mode translation.** Non-localized
   value staged in the draft is still there afterwards, and the live value is untouched.
5. **#116 stays fixed.** A reviewer's corrected draft is published verbatim, not
   re-translated.
6. **Draft mode lands in the draft.** Live value untouched; document `_status` unchanged.
7. **Publish takes the current draft live**, including pending values the translation did
   not touch. Reverses the PR #117 case asserting the opposite.
8. **Publish is scoped to the locale.** Other locales stay unpublished; the document's
   `_status` becomes `published`.
9. **A no-drafts collection behaves exactly as on `main`.** Control case must pass against
   both implementations.
10. **The auto-translate loop guard covers both writes.** The publish write carries
    `AUTO_TRANSLATE_SKIP_CONTEXT_KEY`; a source publish causes exactly one translation pass
    per target locale, not more (the existing loop-guard spec's `translateCount` delta).
11. **The removed concepts are gone.** `grep -rn "existingTranslation\|hasCarriedValues\|carried" src`
    in the package returns nothing.
12. **Checks clean.** `check-types` (both packages), package unit tests, integration tests,
    `lint` with no warnings beyond the 59-warning repo baseline.
13. **Every new or reversed test bites.** Mutation evidence for criteria 1, 2, 4 and 7.

## Risks

- Two writes where there was one → two versions per run, and the loop guard must mark
  both (criterion 10 is what proves it).
- Autosave collections with a draft write followed immediately by a publish are unmeasured;
  the existing autosave integration case is the guard.
- Criterion 7 is a deliberate behaviour change and must reach the README.
- `draft: true` on a collection without drafts is assumed a no-op; criterion 9 proves it.
