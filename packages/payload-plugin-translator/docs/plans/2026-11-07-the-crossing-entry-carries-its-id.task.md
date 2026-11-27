# The crossing entry carries its id

Build step: 2026-11-06-the-crossing-surface.design.md #3

A host holds an ordered list of crossing entries and, to learn whether one wants a value, must run
it. That is tolerable while every entry is run anyway. It stops being tolerable at the next step,
where a field declares `formats` — a list of language ids naming who may take it over — and the
host has to narrow its list **before** offering anything.

## Requirements / Task restatement

- R1 (in) A crossing entry declares which language it speaks, readable without running it.
- R2 (in) The crossing the walk makes takes its language from that declaration, so an entry cannot
  answer as one language while being listed as another.
- R3 (out) The `formats` filter itself, and everything that resolves a field's declaration — build
  steps 4 and 5.
- R4 (out) Any change to what an entry recognises, or to placement.

## The motivation on the record is dead; this is the live one

The design justifies this step by a defect that no longer exists: *"without the id the entry has
already seated a clone of the source over it."* An entry used to be handed a writer and could
overwrite a field before declining it. That was removed earlier — an entry now returns a working
copy and performs nothing, and placement happens only when translations are applied.

What survives is the reason D4 of the same design gives: the language id "stops being internal and
becomes a value users type in `crossing.formats`". A value a user types must match something the
host can read off an entry it has not called. Without that, `formats` could only be honoured by
running every entry and discarding the answers — which is both wasteful and, for an entry with side
effects, wrong.

## What already exists — platform · installed · project · verdict

Nothing new is built: this moves one member from the result to the entry. No search.

## Decisions

### D1. The entry becomes a record; `open` keeps the question

`ContentCrossing = { languageId, open }`. The id is a property of the entry, fixed when it is
constructed; the context and the working copy remain answers to one offer.

- *Rejected — keep the function and hang the id on it as a property.* It types, but a callable with
  metadata reads as neither one thing nor the other, and nothing stops a plain function being
  passed where the host then reads `undefined`.
- *Rejected — keep the id on the result only and have the host run every entry to filter.* That is
  the shape this step exists to leave, and it makes `formats` cost a full pass over the list.

### D2. `OpenedCrossing` gives the id up

It becomes `{ context, workingCopy? }`. Two places to spell one language is how an entry comes to
be listed as one language and answer as another, and the host would have no principled choice
between them.

- *Rejected — keep both and let the result win.* Then the declaration is advisory, and the filter
  the next step builds on it is a lie.
- *Rejected — keep both and refuse a mismatch.* A refusal needs a reason to exist; nothing can
  produce a legitimate mismatch, so the state should not be representable.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | An entry's language is readable without calling it | a test reading `languageId` off `payloadLexicalContent()` with no call to `open` | exit 0, the case runs |
| AC2 | R2 | The crossing the walk makes names the entry's declared language | a test whose entry declares one id and whose `open` returns only a context; the resulting walk enters that language | exit 0, the case runs |
| AC3 | R2 | An opened result has no language to give | `grep -A5 "export type OpenedCrossing" src/languages/contentCrossing.ts \| grep -c languageId` | prints `0` |
| AC4 | — | Every crossing entry in the package is a record with both members | `bun run check-types` | exit 0 |
| AC5 | — | Nothing already passing breaks | `bunx vitest run` | 219 files or more, no failures |
| AC6 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC7 | — | Both apps still type-check | `bunx turbo run check-types --force` from the repo root | 9 successful, 9 total |

## Pre-flight

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | the test above | no such test; `payloadLexicalContent()` returns a function | change — must fail now, and does |
| AC3 | the grep above | prints `1` | change — must fail now, and does |
| AC5 | `bunx vitest run` | 219 files, 2622 passed, 9 skipped | invariant — passes now |
| AC6 | `bunx oxlint .` | 34 warnings, 0 errors | invariant — passes now |
| AC7 | `bunx turbo run check-types --force` | 9 successful, 9 total | invariant — passes now |

## Risk notes

Classified **low**: a package-internal shape with seven call sites, all in this repository, all
found by the type-checker. Nothing is re-exported from `src/index.ts`, and no behaviour changes —
the same entries recognise the same values and produce the same crossings.

The one thing worth watching is that the host must now read the id from the entry rather than the
result; a careless edit could read it from neither and default, which would silently route a value
to the wrong language. AC2 exists for that.

## Review

Filled by the verification pass; the run log lives beside this file.

## Decisions by the owner

2026-11-07 — decided by the owner: work the build sequence autonomously, taking the optimal
decision at each fork rather than stopping to ask, and commit nothing.
