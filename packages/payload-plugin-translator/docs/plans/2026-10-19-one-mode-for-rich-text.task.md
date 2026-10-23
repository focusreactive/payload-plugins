# One mode for rich text

Implements step 2 of the §9 order of work in
[2026-10-18-the-rewiring.md](./2026-10-18-the-rewiring.md), **part two of two**. Part one
([2026-10-19-remove-the-names-nothing-calls.task.md](./2026-10-19-remove-the-names-nothing-calls.task.md))
merged as PR #184 and released `1.0.0-next.1`.

## Requirements / Task restatement

Remove `translatorPlugin({ experimental: { inlineMarks } })` — the last deprecation that
belongs to no later step, and the only part of step 2 that changes behaviour.

The flag is a boolean threaded through ten files of the package and two of the sandbox. It
ends in one line (`core/translation-pipeline/translateContent.ts:59`):

```ts
const marksUsable = inlineMarks && translationProvider.capabilities?.inlineMarks === true;
```

After the removal the right half stands alone: **container mode is decided by the
provider's declared capability, not by the host's setting.**

In scope: the thread, the ledger entry, the sandbox's own switch, and the tests built
around the flag. Out of scope and left to their own steps: the OpenAI client-construction
layer (step 8), the nine other ledger entries (steps 5, 6, 8), and the mark machinery
itself — only the switch goes, never the mechanism.

## What already exists — platform · installed · project · verdict

Nothing new is built. This removes a parameter and deletes the branch it fed. No search.

## Decisions

**D1 — the `experimental` option goes with its only entry.** `inlineMarks` is the sole
member of `experimental`, so removing it leaves `experimental?: {}` — a published option a
host can pass that accepts nothing and does nothing.

*Chosen:* delete `experimental` as well.
*Rejected — keep the empty object.* This is the ledger's recorded position
(`DEPRECATIONS.md#experimental-inline-marks`, *Scope*: "The `experimental` option itself is
permanent — it is where the next transitional switch will live"). It loses on arithmetic
rather than on taste: adding an option back is **additive and ships in a minor**, while
removing one is breaking and can only ship in a major. Keeping an empty `experimental`
through the whole of 1.x buys a future minor nothing it could not have anyway, and costs
every reader of the public type a field with no legal content.
*Constraint cited:* `resolveSettings` (`settings.ts:93`) is the only reader of
`options.experimental`, and after this change it reads nothing from it.
**This one is the owner's call and goes to the gate** — the ledger says the opposite, and
a ledger entry is a recorded decision, not an oversight.

**D2 — `TranslatorSettings.inlineMarks` goes too.** The resolved settings shape is read by
the levels, the route bundle and the admin panel; `inlineMarks` is read from it in exactly
two places (`plugin.ts:131`, `composition/levels/fieldLevel.ts:38`), both of which exist
only to pass it onward. Nothing else consumes it.
*No alternative worth naming:* a resolved field nobody reads is not a field.

**D3 — the sandbox's switch moves to the provider's capability, it does not die.**
`apps/dev` has `TRANSLATOR_INLINE_MARKS=0` (`lib/translator/devToggles.ts:51`), whose
stated purpose is that "a run that silently used the old path would look like a feature
that does not work" — i.e. the sandbox exists to exercise *both* paths.

*Chosen:* the environment variable keeps its name and its meaning, and now decides whether
the sandbox's provider **declares** `capabilities.inlineMarks` (`devToggles.ts:37`).
*Rejected — delete the toggle.* The ability to compare the two paths in a running app is
the sandbox's reason to exist, and the capability is exactly where that choice now lives.
*Rejected — keep the toggle but point it at nothing.* Not a candidate; named only because
deleting the flag without noticing this file would produce it by accident.

**D4 — the per-node tests are reframed, not deleted.** `containerMode.test.ts` is split
into `describe("flag off")` (1 case, a byte-identical recorded baseline) and
`describe("flag on")` (12 cases). The flag is gone, but **both behaviours survive**: a
provider without the capability still translates node by node, and `RichContainerExpander`
falls back to `RichTextExpander` per value when a container cannot be marked
(`RichContainerExpander.ts:23,36-37`).

*Chosen:* rename the two groups after what actually decides — the provider's capability —
and drop `inlineMarks: true` from the calls. The recorded per-node baseline is kept.
*Rejected — delete the "flag off" group as now duplicated* by the existing case at
`containerMode.test.ts:375` ("stays per-node when the provider does not declare
inlineMarks"). It is not a duplicate: :375 asserts *which path ran*, the baseline case
asserts *the exact bytes that path produces*, and the per-node path is still reachable
three ways after this change.

**Shape check:** not run — no trigger fires. No field is added to any type, no exported
function gains a parameter, nothing optional is introduced. Every change is a deletion.

**New surface:** none.

**Written contract owed:** none. `translateContent` loses a parameter; its remaining
obligations are unchanged and already documented on `capabilities.inlineMarks`
(`TranslationProvider.interface.ts:61`).

**Escalate to a design pass?** No. The placement is settled by the step this implements,
and D1 is the only decision with two defensible answers — which is why it goes to the gate
rather than being taken here.

## Acceptance Criteria

Package commands run from `packages/payload-plugin-translator`; sandbox commands from `apps/dev`.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | The flag is gone from the public option type | `grep -c "inlineMarks\|experimental" src/settings.ts` | prints `0` |
| AC2 | …and from the published declarations, so a host passing it fails at build | repo root `bunx turbo run build --filter='@focus-reactive/payload-plugin-translator'`, then `grep -c "experimental" dist/index.d.ts` | build exits 0; grep prints `0` |
| AC3 | The threaded parameter is gone from every internal site | `grep -rn "inlineMarks" src --include="*.ts" \| grep -v "\.test\." \| grep -viE "capabilit\|hasInlineMarks\|INLINE_MARKS_INSTRUCTION\|kernel/lexical"` | prints nothing |
| AC4 | A provider that declares the capability gets container mode with no setting passed | `bunx vitest run src/core/translation-pipeline/containerMode.test.ts` | exit 0; every case that previously passed `inlineMarks: true` now passes only `capabilities`, and asserts the same marked string |
| AC5 | **Unhappy path** — a provider that does not declare the capability still translates node by node | the existing case `containerMode.test.ts` "stays per-node when the provider does not declare inlineMarks", plus `bun run test:integration:sqlite` covering `inline-marks-capability.int.test.ts` | both green |
| AC6 | The recorded per-node output is unchanged | the byte-identical baseline case in `containerMode.test.ts`, reframed but with its expected value untouched | green, and its expected value is not edited in the diff |
| AC7 | The whole translator behaves as before end to end, with the boot option gone | after the AC2 rebuild: `bun run test:integration:sqlite` | no failure; count at or above the 237 passed / 7 skipped baseline |
| AC8 | No new type errors or lint findings, package and sandbox | `bun run check-types` and `bunx oxlint .`; in `apps/dev` `bun run check-types` and `bunx oxlint src` | 0 errors each; ≤45 and ≤5 warnings |
| AC9 | **Scope guard** — the OpenAI client layer is untouched | `git diff --name-only` | names no file under `src/translation-providers/` |
| AC10 | The ledger records the removal | read `docs/DEPRECATIONS.md` | `experimental-inline-marks` carries `**Status:** removed` and a `**Removed:** 2026-10-19 / PR <n>` line, and its *Scope* paragraph agrees with whatever D1 the owner chose |

## Pre-flight

Run against the untouched tree on 2026-10-19, branch `major/translator` at `e6e77452`.

| AC | Command | Result now | Kind |
|---|---|---|---|
| AC1 | `grep -c "inlineMarks" src/settings.ts` | `4`; `experimental` `3` | **change** — fails now |
| AC2 | `grep -c "experimental" dist/index.d.ts` | not run; `dist/` is not built in the tree. `experimental` is in `settings.ts`, which the build emits, so the pre-build count is non-zero by construction | **change** |
| AC3 | the grep above | 19 lines across 10 files | **change** — fails now |
| AC4 | `bunx vitest run src/core/translation-pipeline/containerMode.test.ts` | part of the full run below; the cases pass `inlineMarks: true` **and** the capability, so they cannot yet tell which one decides | **change** |
| AC5 | same file, the `:375` case | green now — it is the one case already written against the capability alone | **invariant** |
| AC6 | the baseline case | green now | **invariant** |
| AC7 | `bun run test:integration:sqlite` | 237 passed / 7 skipped, measured on this branch | **invariant** |
| AC8 | `check-types`, `oxlint` | package 0 errors / 45 warnings; sandbox 0 errors / 5 warnings | **invariant** |
| AC9 | `git diff --name-only` | empty (clean tree apart from the owner's `payload.config.ts`) | **invariant** |
| AC10 | read the ledger | the entry says `live` | **change** — fails now |

Full package baseline: `bunx vitest run` → 151 files, 2110 tests, all passing.

## Risk notes

- **Risk: high**, and the classification changes what the later phases do. It is not the
  size of the diff — it is that this is the one part of step 2 that **changes what the
  plugin does**: a host with a capable provider and the flag off moves from node-by-node to
  container translation of rich text. It touches shared code (the pipeline), has multiple
  consumers, and the behaviour is only observable end to end.
- **Who is affected, precisely.** Only an installation that set `experimental.inlineMarks`
  to false *or left it unset* **and** uses a provider declaring `capabilities.inlineMarks`.
  The plugin's own OpenAI provider declares it, so that is the common case. An installation
  whose provider does not declare the capability sees no change at all.
- **The per-node path is not deleted** and must not be. It remains reachable three ways: a
  provider without the capability, a mark-shaped source sequence, and a single-fragment
  container. AC5 and AC6 exist to hold that.
- **A caller in the sandbox blocks the build if missed.** `apps/dev/src/payload.config.ts`
  and `apps/dev/src/integration/translator/bootTestPayload.ts` both pass the flag; the
  former also carries the owner's own uncommitted edit, which must not be swept into this
  commit.
- **The ledger entry contradicts D1** if the owner takes the deletion. Whichever way it
  goes, the entry's *Scope* paragraph is edited to match, so the record does not keep
  asserting a decision that was reversed.

## Human choices

- **2026-10-19** — the owner split step 2 in two, with this part separate "потому что это
  единственное место с настоящим изменением поведения, и его стоит смотреть в отрыве от
  механической уборки".

- **2026-10-19, at the gate** — D1 settled as written: `experimental` is deleted with its
  only entry. The ledger's *Scope* paragraph, which said the option is permanent, is
  corrected in this change rather than left asserting a reversed decision.
- **2026-10-19, at the gate** — the owner's uncommitted `jobs.runHooks` workaround in
  `apps/dev/src/payload.config.ts` was reverted on their instruction ("там ничего не нужно
  сохранять"), so this change owns that file cleanly. The reverted hunk is kept as a patch
  at `<session scratchpad>/payload.config.runHooks.patch` in case it is wanted back.

## Decisions taken during execution

**D5 — two integration files are deleted, not rewritten.** The flag and the capability made four
corners; only two survive.

- `inline-marks-field-surface-flag-off.int.test.ts` held the corner "capable provider, flag off →
  per-node". Its own comment called it "the fourth corner of (flag × capability), and the only one
  that separates *forwards the configured flag* from *reads the provider's capability*". That corner
  is what this change deletes.
- `inline-marks-field-surface-gate.int.test.ts` held "flag on, capability off". With the flag gone
  its boot configuration is byte-identical to `inline-marks-field-surface-off.int.test.ts`, which
  asserts the same `SOURCE_ORDER`.

*Rejected — invert the first one* to assert container output for a capable provider. That is already
what `inline-marks-field-surface.int.test.ts` asserts, so the inversion would be a second copy.
*The proof deletion owes:* after the change the field surface is covered in both directions, by
`inline-marks-field-surface.int.test.ts` (capability on) and `-off` (capability off); the document
surface by `inline-marks.int.test.ts` plus nesting, structure and corrupt (capability on) and
`inline-marks-capability.int.test.ts` (capability off).

## Review log

### 2026-10-19 — three review angles, high risk

**Angle 1, the removal itself.** No defects on the four points it was given: nothing load-bearing was
dropped at the ten threading sites, the `TranslateDocumentHandler` constructor and its one call site
agree, the per-node path stays reachable, and nothing still reads `settings.inlineMarks` or
`options.experimental`. Two findings:

- **Accepted and fixed:** an orphaned docblock in `translate-field/model.ts` survived the field it
  described (`/** Not optional: an omitted flag would silently select per-node translation … */`).
- **Carried to the owner:** the README still documents the removed option in four places.

**Angle 2, the tests.** No coverage lost. It confirmed D5 independently — both deleted files are
redundant after the change and named the surviving file that covers each — and judged the
`settings.test.ts` deletion legitimate: the removed assertions were about a field `resolveSettings`
no longer returns. One formatting leftover, fixed with the formatter.

**Angle 3, the sandbox and the breaking surface.** Three findings, all accepted and fixed:

- **Major.** The ledger entry read as a harmless no-op. It now names who is affected — every host
  whose provider declares the capability and had the flag off or unset, which includes everyone on
  the bundled OpenAI provider — says their rich text changes shape on upgrade, and says the only way
  back is a provider that does not declare the capability.
- The entry's *Why* still spoke of the flag as live and its code refs still pointed at
  `src/plugin.ts (the option)`. Both corrected.
- **A regression the diff introduced:** `TRANSLATOR_INLINE_MARKS=0` had stopped reaching the real
  OpenAI provider, because the toggle was attached only to the sandbox's fake one — so with an API
  key present the variable silently did nothing, where before the plugin flag applied to every
  provider. The toggle now wraps the real provider too, and its docblock says so.

### 2026-10-19 — comment audit

Two docblocks added, no inline comments, over 19 added lines of code — density fine. Four blocks
judged, five verdicts applied:

- the sandbox toggle's docblock was over budget: history, motivation and a restatement of its own
  one-line body. Trimmed to the two facts the code cannot state — that the default is **on**, unlike
  the `=== "1"` toggles beside it, and that it is applied to the real provider as well as the fake;
- `bootTestPayload`'s option was renamed `declareCapability` → `declaresInlineMarks`, which is what
  its docblock existed to say. The docblock shrank to `@default false`, and the local alias went
  with it. Seven call sites, all in files this change already touched;
- the docblock on `FieldTranslationConfig` restated the two field names it sat above — deleted;
- `containerMode.test.ts` carried `// Baseline captured from the untouched tree on 2026-09-09 (see
  the task contract)`, which this change made ambiguous twice over: two contracts now cover the case,
  and "untouched" no longer says untouched by what. The fact moved into the test's own name —
  "byte-identical to the output recorded before container mode existed" — and the comment went;
- **one comment outside the diff that this change made false**: the capability's own docblock in
  `TranslationProvider.interface.ts` said the core keeps translating node by node "whatever the
  plugin config says". There is no plugin config any more. Corrected.

One of the auditor's entries was stale on arrival: it reported that the toggle reaches only the fake
provider, which angle 3 had already found and which was fixed between the two runs.

### Gates

- `sp-lint-delta` — no findings introduced, over 457 lines of analyzer output.
- `sp-diff-checks` — **one FAIL, examined and accepted**: `test-integrity` reports "2 assertion
  line(s) removed from `settings.test.ts` with none added back". Both assertions were about
  `resolveSettings(...).inlineMarks`, a field this change deletes; the remaining settings keep their
  assertions, and angle 2 reached the same verdict independently. The gate is right to demand the
  justification rather than let a hollowed-out test pass quietly — it is recorded here rather than
  silenced.
