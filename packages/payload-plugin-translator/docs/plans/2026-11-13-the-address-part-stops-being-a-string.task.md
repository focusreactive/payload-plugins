# The address part stops being a string

Closes Q2 of `./2026-11-13-the-engine-contract-questions.md`.

Every `file:line` below was read at the working tree of 2026-11-13, which carries the committed
engine move (`b36b049b`) plus the uncommitted typing of the languages' starting data.

## Task restatement

An address names one translatable piece of text — `body.b1:cta.heading` — and is the key under
which a translation record is stored. The rules for writing it as one string live in the plugin
(`core/domain/content-projection/idPath.ts`): parts joined by a dot, an element written
`id:blockType`, `#index` where there is no id, and four characters escaped inside a part.

Today the **language** applies those rules before handing a part to the engine, and the plugin
takes the result on trust. `PayloadFields.language.ts:3` imports the plugin's `renderSegment`,
`PayloadLexical.language.ts:180` calls it, and `walkAddress.ts:10` casts the string back to the
guarded type without checking anything.

After this change a language hands over a description of the position and nothing else. The plugin
writes the string, once, where the engine's path is converted.

## What already exists

- **The engine never reads a part.** In all of `src/traversal` there is the declaration
  (`contract.ts:18`) and two array spreads (`walk.ts:42`, used at `:102` and `:107`). Nothing
  inspects a part's content. So `string | number` is not a type the engine needs — it is the
  narrowest thing that happened to be written.
- **The rules are already a function, and it is already shared.** `renderSegment` and
  `joinRendered` do the whole job, and `elementSegment` already builds the structural description
  a language would hand over — both languages call it today and then wrap the result in
  `renderSegment`. The change removes the wrapper rather than adding anything.
- **The engine's own fixtures already hand over raw values** — `segments: [name]`,
  `segments: [name, element.id ?? index]` (`__tests__/fixtures/payloadFields.ts:76`, `:91`,
  `storyblok.ts:63`). They have never applied the plugin's rules. So the two populations already
  disagree about what a part is, and the type cannot tell them apart. That is the defect.
- **Verdict:** nothing new is built. One type widens, two call sites lose a wrapper, one gains it.

## Decisions

### D1 — The engine's part becomes opaque

**Chosen:** `PathSegment = unknown`.

**Rejected: narrow it to the plugin's structural union** (`{kind:"key"…} | {kind:"element"…} |
{kind:"index"…}`). The engine would then know that an address is made of keys, elements and
indices. It is kept ignorant of exactly that, and the claim is not even true of every host: the
engine's own fixtures address with bare strings and numbers.

**Rejected: keep `string | number` and give the plugin a guarded type the engine declares.** The
escaping rule would move into the engine, which is the opposite of the intent.

**Cites:** the engine reads no part (verified above), so widening the type costs it nothing.

### D2 — The rules are applied at the seam, not by the language

**Chosen:** a language emits the plugin's structural description; `walkAddress` calls
`renderSegment` on every part before `joinRendered`.

**Why the stored keys cannot move.** The rendered string is produced by the same `renderSegment`
over the same values, followed by the same `joinRendered`, in the same order — the call simply
happens one layer later. No rule, separator or escape changes. The frozen baseline is the proof
and the guard: 43 checks over 7 distinct addresses covering every rule — a plain key (`title`), a
nested key (`meta.summary`), an element with a type (`layout.q1:quote.saying`), an element without
one (`sections.s1.caption`) and the positional fallback (`sections.#0.caption`).

**Rejected: leave the language rendering and check the result at the seam.** The check is not
buildable: an escaped part and a raw part are the same kind of value, and an id read from a
document may itself contain a backslash, so `a\.b` is both a legal raw id and the escaped form of
`a.b`. Nothing can tell them apart after the fact — which is why the responsibility has to move
rather than be verified.

### D3 — The engine prints an opaque part generically in its error messages

`errors/renderIdPath.ts` does `idPath.join(".")`, which on an object yields `[object Object]`.
Three errors use it: a refused context, too many crossings, and a cycle.

**Chosen:** the engine prints a part it cannot interpret by dumping it, and a string or number
plainly. Ugly for a structural part, correct for every host, and it needs no knowledge.

**Rejected: a renderer supplied by the host**, as a member on the language or an option on the
walk. It is the better message and it has exactly one real caller — the plugin. One caller is not
enough for a new contract member, and the engine is the thing we are trying to give fewer
opinions, not more.

Recorded: no test asserts any of these three message texts, so the change is invisible to the
suite — which is a reason to be careful, not a reason to skip it.

### D4 — The number branch at the seam goes

`walkAddress.ts:8-10` turns a bare number into an index part and casts anything else. After D2 no
shipped language emits a bare number: every `segments:` in `src/languages` is built from
`elementSegment` or a key. The branch becomes unreachable, and deleting it needs the same proof as
adding it — that proof is the grep plus the frozen baseline, which exercises the positional
fallback through `elementSegment`.

### D2a — The seam checks the part instead of casting it (added during the build)

D2 said `walkAddress` would call `renderSegment` on every part. Written that way it needs a cast
from the walk's `unknown` to the plugin's part — which is the very assertion this task exists to
remove, moved rather than deleted.

**Chosen:** `isPathSegment` in `idPath.ts`, and a seam that throws a named error on a part it
cannot read. The guard tests each kind's own members rather than the tag alone, because `render`
reads them straight: a value tagged `key` with no `name` would otherwise reach the escaping as
`undefined`.

**Rejected: widen `renderSegment` to take `unknown`** and let its existing `default` branch throw.
It has exactly one caller now, so the widening costs nothing today — and it would mean the module
that owns the writing rules no longer states what it writes.

### D4a — What the removed number branch actually changes

Dropping the number branch means a language that hands over a bare number is no longer quietly
turned into a positional part: the seam refuses it by name. One language did exactly that — the
third format modelled in `PayloadFields.contentCrossings.test.ts` — and it now hands over the
host's own `{ kind: "index" }`. That is the change working, not a casualty of it: a format whose
addresses this plugin writes has to speak the plugin's vocabulary, and before this task it could
be wrong without anyone noticing.

### D4b — A test was asserting something that is not an address

The same file checked `target.idPath.join(".")`. A bare join is not how an address is written, so
the assertion passed over paths the plugin would have rendered differently — `notes.0` where the
plugin produces `notes.#0`, the marked positional fallback. The check now goes through the
plugin's own rendering and expects `notes.#0`, which is what every walk has produced all along.
The old expectation was never the address; it was the shape of the array.

### D3a — Both places that dump a part had to be made unable to throw (added during the build)

A part belongs to the host, so it may be cyclic, hold a bigint, or carry a `toJSON` that throws —
and `JSON.stringify` throws on the first two. Both dumps ran while an error was being built, where
a second throw replaces the error worth reading with a confusing one.

The engine now falls back to `Object.prototype.toString.call`, which cannot throw, rather than to
`String()`, which throws on a null-prototype cyclic object. The plugin's seam stopped dumping
altogether: its message names the part's `kind` when it has a string one and its `typeof`
otherwise, which is what a reader needs to find the language that sent it and cannot fail.

The engine's local dump is also renamed, because `renderSegment` was the name of a different
function in `idPath.ts` and the two are easy to confuse in review.

### D6a — `@public` stays on `PathSegment`, and the reason I first gave for dropping it was wrong

I removed the tag on the grounds that nothing under `src/traversal` is published. That is wrong:
the engine's types reach the published declarations transitively —
`TranslatorPluginConfig.modules` → `TranslationModule` → `ConfigTimeContext.walk` → `LanguageTable`
→ `RegisteredLanguage` → `Step` → `PathSegments`, and `dist/server/modules/plugin-config/types.d.ts`
imports from `traversal/index.js`. The tag is restored, and every sibling in the file keeps it.

**What this means for consumers, recorded rather than waved away.** For anyone reading tokens
through that chain the type went from `string | number` to `unknown`, so they must narrow before
use. `ConfigTimeContext` is marked internal and `TranslationModule`'s own documentation says
writing one is not supported yet, so no consumer is known — but it is a type-level change to the
published declarations, and it belongs in the release notes for the major.

### D5 — The engine's fixtures keep handing over raw values

They compile unchanged against `unknown`, and they are the coverage proving the engine does not
interpret what it carries. Changing them to mimic the plugin would delete exactly that evidence.

### Placement, surface, escalation

| Piece | Where |
|---|---|
| the opaque part | `src/traversal/contract.ts:18` |
| the generic print | `src/traversal/errors/renderIdPath.ts` |
| dropping the wrapper | `PayloadFields.language.ts` (`rendered`, `key`), `PayloadLexical.language.ts:180` |
| applying the rules | `src/core/domain/content-projection/walkAddress.ts` |
| the tests that read an engine path directly | `PayloadFields.contentCrossings.test.ts:88`, `src/languages/__tests__/addresses.ts`, and whatever the type-check finds |

- **New surface:** none. The shape check fired on "a member of a type implemented outside its own
  file changes type"; two shapes were compared in D1.
- **Written contract?** `walkAddress` now owes its caller that every part it is handed came from
  the plugin's own vocabulary. That is a promise its signature cannot state, and it is the reason
  D2 is a move of responsibility rather than a check.
- **Escalate:** no. One package; the approach was decided by the owner before this task started.

### D6 — Testing order

This is a refactor whose whole contract is "the written address does not change", so the guard is
the frozen baseline, which already exists and must stay green untouched. Two checks are added —
an end-to-end escaping guard and one on the error message — and each earns a mutation. Neither can
be red-first: both describe behaviour that holds today and must survive.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | No language applies the plugin's writing rules | `grep -rn "renderSegment" src/languages` | no match |
| AC2 | The engine names no part vocabulary and reads no part | `grep -n "PathSegment" src/traversal/contract.ts`, and `bunx vitest run src/traversal/__tests__/depends-on-nothing.test.ts` | the declaration is opaque; the scan passes |
| AC3 | **The stored keys do not move** | `bunx vitest run src/__tests__/translation-path/theHashCannotAlias.test.ts`, with the baseline file unmodified | 43 passed, and `git diff -- src/__tests__/translation-path/fixtures/embedFreeHashes.baseline.json` is empty |
| AC4 | Escaping still applies through a whole walk, not just in the function | a new check: a field whose name contains a dot, walked end to end, lands at the escaped address | the address is `a\.b`, and the check fails when the seam's call to the rules is removed |
| AC5 | The cast at the seam is gone | `grep -n "as RenderedSegment" src/core/domain/content-projection/walkAddress.ts` | no match |
| AC6 | **Unhappy path** — an error raised mid-walk still says where it happened | a new check: refuse a crossing at a known field and read both the message and `error.idPath` | the message carries the dumped part, and the parts on the error write back to `body` through the plugin |
| AC6b | **Unhappy path** — a part the plugin cannot write is refused at the seam, by name | a new table check over `isPathSegment` and `walkAddress`: a bare string, a bare number, an undeclared kind, each kind with a member of the wrong type, and `null` | each is refused and raises an error naming the part's kind; the five well-formed kinds are accepted and write as expected |
| AC7 | No new type errors | `bun run check-types` | exit 0 |
| AC8 | Nothing else in the suite changes behaviour | `bunx vitest run` | 222 files, at least 2621 passed, 9 skipped |
| AC9 | No new analyzer findings | `bunx oxlint packages/payload-plugin-translator` | 0 errors, at most 33 warnings |
| AC10 | A real Payload boot against `dist` still works | `bun run build`, then from `apps/dev` `bun run test:integration:sqlite` | 62 files passed, 248 passed, 7 skipped |

## Pre-flight

Run against the tree as it stands on 2026-11-13, before any edit for this task.

| AC | Command | Result | Class |
|---|---|---|---|
| AC1 | the grep | `PayloadFields.language.ts:3` imports it, `:46` aliases it as `rendered`; `PayloadLexical.language.ts:1` imports it, `:180` calls it | change |
| AC2 | `grep -n "PathSegment" src/traversal/contract.ts` | `export type PathSegment = string | number;` | change |
| AC3 | the frozen baseline | 43 passed | invariant |
| AC4 | — | no end-to-end escaping check exists; `idPath.test.ts` exercises the rules directly, never through a walk | new guard, invariant in behaviour |
| AC5 | the grep | `walkAddress.ts:10: : (token as RenderedSegment)` | change |
| AC6 | — | no test asserts any engine error message; the three messages are unguarded | new guard, invariant in behaviour |
| AC6b | — | `isPathSegment` did not exist; `walkAddress` cast instead of refusing, so there was nothing to refuse | change |
| AC7 | `bun run check-types` | exit 0 | invariant |
| AC8 | `bunx vitest run` | 222 files, 2621 passed, 9 skipped | invariant |
| AC9 | `bunx oxlint packages/payload-plugin-translator` | 33 warnings, 0 errors | invariant |
| AC10 | from `apps/dev`, `bun run test:integration:sqlite` | 62 files passed, 248 passed, 7 skipped | invariant |

## Risk notes

- **High risk, and the reason is data rather than code.** The written address is the key under
  which translation records are stored. A change of one character in the rendering marks every
  stored document stale, and the symptom — "everything is suddenly out of date" — appears far from
  the cause. AC3 is the guard, and the baseline file must not be touched: a re-recorded baseline
  would pass while proving nothing.
- **The suite is blind to two of the three things this touches.** No test asserts an engine error
  message, and no test walks an address with an escapable character end to end. AC4 and AC6 exist
  to close that before the change, not after.
- **The engine's fixtures and the shipped languages will hand over different kinds of value**, and
  the type will no longer object, because `unknown` objects to nothing. That is intended — the
  engine carries what it is given — but it means the compiler stops being the thing that keeps the
  plugin's languages consistent with each other.

  **An earlier draft of this note claimed the gap was closed by `elementSegment` being the only
  builder, checked by AC1's grep. That was wrong on both halves and is corrected here.** There is
  no builder for a key or for a bare position, so a language writes the tagged object by hand —
  `PayloadFields.language.ts` does, and the third-format language in
  `PayloadFields.contentCrossings.test.ts` had to be hand-edited into one during this build. And
  AC1 greps for `renderSegment`, which a hand-written literal does not contain, so it cannot see
  either site. What actually holds both today is that each one carries a `PathSegment` annotation,
  which the compiler does check — a convention the author must remember, not a boundary. Giving
  `idPath.ts` a `keySegment` beside its `elementSegment` would make it one; recorded as a
  follow-up rather than taken here, since it is the owner's call at the gate.
- **The error messages get uglier** for the plugin's own walks, by D3. A developer reading
  `at {"kind":"key","name":"body"}` instead of `at body` is worse off than today; the alternative
  needed a contract member for one caller.
- **The branch already carries one commit and one uncommitted task.** This is a third change on the
  same branch; whether the second is committed before this one starts is the owner's call at the
  gate.
