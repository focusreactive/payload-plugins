# Task — honest `structuredOutput` docs, ledger fix, and the deprecated class split out

**Date:** 2026-08-28 · **Risk:** low · **Behaviour change:** none
**Source:** the architecture review recorded in
[2026-08-28-provider-review-findings.md](./2026-08-28-provider-review-findings.md); only the items
that live entirely inside `src/translation-providers/**` were taken.

**Off-limits this run:** `src/core/**` (another session is extracting it into its own package) and
`apps/**`. That rules out widening the port, renaming `core/domain/translation-providers/`, and the
stale comment inside it.

## Decisions

**Changes 1–3 carry no design decision** — they are documentation and one ledger line.

**Change 4 — where the deprecated class lives.** Chosen: `openai/OpenAITranslationProvider.deprecated.ts`,
adding `.deprecated.ts` to the role-tag vocabulary in the package `CLAUDE.md`.

Rejected: `OpenAITranslationLegacy.provider.ts`, which changes no convention but breaks the match
between a file's domain base and the symbol it exports — the match the convention exists to hold.
Also rejected: leaving the class in place, which is the thing the change is for.

Cites the package `CLAUDE.md`: "The tag names *what kind of thing* the file is, so a directory
listing reads as an architecture map" and "Extend this vocabulary rather than inventing a parallel
scheme." The new tag makes the next-major removal list readable from a directory listing — the job
the ledger has been failing at, evidenced by the dangling reference this task fixes.

**No new abstraction. No public surface change** — every export keeps its name and its path as seen
from outside the package.

> **Superseded the same day by `ab0fb528`.** That commit narrowed the deprecation this task recorded
> and added `openAIComplete` as a new public export — additive, so nothing here broke, but the claim
> above no longer describes the branch. Reasoning in
> [2026-08-28-provider-review-findings.md](./2026-08-28-provider-review-findings.md), and criterion 5
> below should be read as "no export was renamed or removed".

## Acceptance criteria

1. `OpenAIProviderBase.structuredOutput`'s docblock names **both** risks of the strict schema —
   gateway rejection, and a ceiling on the number of translatable pieces in one request — and what
   `json_object` gives up in exchange: a dropped key is detected rather than prevented, a partial
   reply is applied, and the report reaches a server log the editor never sees. No invented numbers
   for the ceiling.
2. `README.md` carries the same substance next to the options table.
3. `createTranslationProvider`'s `@example` no longer shows `signal` wired into a service call.
4. Every code ref in `docs/DEPRECATIONS.md` resolves to a path that exists (checked by script:
   `scratchpad/check_refs.sh`; one is dangling today).
5. The deprecated `OpenAITranslationProvider` class lives in its own file with its tests beside it;
   `src/index.ts`, `translation-providers/index.ts` and `openai/index.ts` export exactly what they
   export today.
6. 1291 tests pass, `check-types` clean, lint 0 errors and 0 warnings on every touched file.
7. Comment density in the touched files does not rise (two audits already cut it from 3.9 to 1.6
   lines per 10).

**Baseline for criterion 5:** the existing `describe("OpenAITranslationProvider (deprecated class)")`
block already pins the class's behaviour and moves with it — no separate snapshot needed.

## Risks

- The `.deprecated.ts` tag is a package-level convention change decided for a single file's sake.
  Accepted deliberately: it pays off across all five live deprecations, and the alternative breaks a
  stronger rule.
- Documentation is the deliverable for three of four changes, so "done" is a judgement about
  wording. Criterion 1 is written to be checkable by content, not by feel.
