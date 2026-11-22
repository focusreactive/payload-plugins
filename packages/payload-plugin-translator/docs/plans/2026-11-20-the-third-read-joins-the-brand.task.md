# The third read joins the brand

Build step: 2026-11-20-the-host-config-becomes-our-rules.design.md #2

## Requirements / Task restatement

Two reads sit side by side in one `Promise.all` in `translate-document/targetDocument.ts`. The
first goes through the shared reader and takes its version arguments from the collection's
world. The second is written out by hand, and it is the same call: same request scope, same
depth, same access half, same version arguments — only the locale differs.

This step removes the hand-written copy, so the branded read binds all three production
sites rather than two of three. **No behaviour changes:** every argument reaching the CMS is
byte-identical afterwards.

Covers R1 of the design.

## What already exists — platform · installed · project · verdict

The wrapper already exists and already does this. Its body and the hand-written call were
compared argument by argument and differ in the locale alone. Nothing new is built; one
duplicate is deleted and one name is corrected. No search of the platform or the installed
libraries was needed, because nothing was going to be written.

## Decisions

- **The shared reader is renamed to what it does, and serves both locales.** *Chosen:* the
  reader stops being named for one of its two uses. *Lost:* keeping the name and calling it
  with the target locale — one line instead of fifteen, but then the name lies at that call
  site, and a name that lies is fixed in code rather than lived with. *Also lost:* a sibling
  reader for the target locale — it would be a byte-for-byte copy of the one that exists, and
  a second name for one body is the duplication this step is removing. *Constraint:* the
  design's own selection rule — an answer that adds more machinery than it removes is not an
  answer. One entry after, against two entries plus a shared private body.
- **The staleness port keeps its own name.** *Chosen:* `SourceDocumentReader` in the
  provenance shapes is untouched. *Lost:* renaming it for symmetry. *Constraint:* it names
  the port the staleness recompute reads the *source* through, and that is true of it
  specifically; the shared reader's neutrality does not make its callers neutral.
- **The reader's promise is restated, not dropped.** The guarantee that fingerprint-computing
  paths must share one reader is a constraint on those callers, not on the function's
  exclusivity, and it survives the rename unchanged in force.

**Placement.** The reader moves from `shared/payload/sourceDocument.ts` to
`shared/payload/documentLocale.ts`, because the package's layout rule names a `camelCase.ts`
after the one thing it does, and the file no longer does a source-only thing.

**New surface.** None. One export is renamed; nothing is added.
**Written contract?** None beyond the branded argument type, which step 1 already carries.
**Escalate?** No; the design covers this step.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | The target-locale read no longer calls the CMS directly | `grep -c "payload.findByID" src/server/features/translate-document/targetDocument.ts` | 0 |
| AC2 | R1 | A hand-typed argument object cannot be passed at the target read | plant one there, run `bun run check-types`, revert, quote both outputs | red with the plant, green without |
| AC3 | — | The arguments reaching the CMS are byte-identical | `bunx vitest run src/server/features/translate-document src/server/modules/translation-stub` | exit 0, the existing argument assertions run unchanged |
| AC4 | — | No reference to the old reader name survives | `grep -rw fetchSourceDocument src` | 0 hits |
| AC5 | — | No type errors | `bun run check-types` | 0 errors |
| AC6 | — | The analyzer does not regress | `bunx oxlint .` | 0 errors, warnings at or below 26 |
| AC7 | — | The unit suite stays green at its recorded counts | `bunx vitest run` | 3061 passed, 15 skipped |
| AC8 | — | A real boot still answers as before | from `apps/dev`: `bun run test:integration:sqlite` | 278 passed, 2 expected failures, 7 skipped |

## Pre-flight

Run against the tree as this step starts, which is the tree the previous step left.

- **AC1** — one direct call today. *change* — fails now, as it must.
- **AC2** — not runnable until the read goes through the wrapper. *change* — the plant is the
  proof and is run in the build phase.
- **AC3** — the assertions exist at `translate-document/__tests__/handler.test.ts:158-159` and
  `:189-192`, and at `translation-stub/__tests__/translationStub.test.ts:215`. *invariant* —
  passes now, and is the behaviour baseline this step must not move.
- **AC4** — 13 occurrences today. *change* — fails now, as it must.
- **AC5** — 0 errors. *invariant* — passes now.
- **AC6** — 26 warnings, 0 errors. *invariant* — passes now.
- **AC7** — 3061 passed, 15 skipped. *invariant* — passes now.
- **AC8** — 278 passed, 2 expected failures, 7 skipped. *invariant* — passes now. The two
  expected failures are the recorded probe for a defect this work does not yet fix.

## Risk notes

- **Classified low**, and the classification is acted on: the change is a rename the
  type-checker verifies plus one call that becomes a call to an existing function, with the
  behaviour baseline pinned by assertions that already exist. One review angle rather than
  three.
- The rename touches a file name, so every import of it moves. Nothing outside the package
  can see it — the reader is not re-exported from the package entry.
- A second session edits this tree; it is checked before each edit, and anything that appears
  and is not this work is reported rather than merged into it.

## Decisions by the owner

- 2026-11-20 — build the steps of this design in sequence without stopping at each one's
  gate, with the quality pass run against the working tree rather than the review marker.
