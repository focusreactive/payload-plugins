# The engine's contract — the questions left, to be taken one at a time

The traversal engine now sits at `src/traversal` and is held there by a lint zone and a scan test.
Nothing about it is published: `src/index.ts`, `./testing` and the `exports` map name none of it.

That is what makes this list worth having. Every question below is an edit in one folder today.
Each one becomes a promise to outside code the moment the engine is published (#203), and changing
a promise costs a coordinated major release across two packages. #203 is now out of the next major
and marked low priority, so there is time — but the cost of each question rises the day it ships,
not the day it is asked.

**What this list is not.** The packaging half of #203 — the manifest fields, the plugin's
dependency on a published engine, the release order of two coupled packages and the prerelease
tag — is not here. That half genuinely needs publication and waits for it.

**How to use this.** One question per working session. Each has a status line; move it to
`decided` with the date and a one-line answer, or to `dropped` with the reason.

| # | Question | Needs publishing? | Status |
|---|---|---|---|
| Q1 | What type is the context a language is entered with | no | **half done** 2026-11-13 |
| Q2 | What type is an address part where the engine carries it | no | open |
| Q3 | Which tree does a crossing hand over, the source or the target | no | **closed** 2026-11-13 |
| Q4 | What must `enter` refuse, and who checks that it does | no | **moved to #203** |
| Q5 | Where does "a plain string is one unit" live | no | open |

**Q1, half done.** Each shipped language's starting data now has one named type used at both the
packing end and the reading end — `FieldWalkStart` for the Payload fields language,
`RichTextContext` for the Lexical one — and a misspelled member at any of the three packing sites is
a compile error. What is *not* done is the compulsory member through which a language refuses
starting data that is not its own: its payoff arrives only when languages written outside this
package exist, so it moved to #203 with Q4. Recorded in
`2026-11-13-the-language-declares-its-context.task.md`.

**Q3, closed, and not by this work.** The audit's finding described the code before the placement
mechanism landed. Verified on 2026-11-13: all three implementations that open a crossing — the
shipped `PayloadFields.language.ts` (through `value`, which `step` reads from `cursor.source`) and
both engine fixtures (`fixtures/payloadFields.ts:124`, `fixtures/storyblok.ts:93`) — read the tree
from the source, clone it, and hand the clone over, placing it into the target through
`placement`. No implementation hands over the target tree any more, so there is nothing left for
the contract to disambiguate.

**Q4, moved.** A language cannot be *made* to declare how it recognises its own starting data
without changing the engine's `Language` contract, which every one of the twenty-two
implementations joins. Inside this package no language ever packs starting data for a different
one, and both shipped languages refuse foreign data honestly, so the member buys nothing until the
engine is published. The careless fixtures (`fixtures/prosemirror.ts:68`, `fixtures/lexical.ts:62`)
are the examples a host would copy, and they are fixed in the same step.

Q1 and Q4 are the same seam read from two sides, and Q2 and Q3 both decide what a second host is
allowed to get wrong. Taking them in order is not required; taking Q1 before Q4 and Q2 before Q3
saves re-reading the same code twice.

---

## Q1 — What type is the context a language is entered with

**Status:** half done on 2026-11-13 — the type is named and used at both ends; the compulsory
recogniser moved to #203. See the note under the table.

**Where.** `src/traversal/contract.ts:200` and `:243`.

```ts
context: unknown;
enter(args: { value?: unknown; context: unknown }): { nodes: readonly N[]; cursor: C } | null;
```

**What happens because of it.** The engine promises nothing about the starting data it hands a
language, so every language opens by forcing a type the compiler never checks, then re-checking it
by hand at run time, then forcing a second type. From `PayloadFields.language.ts:130`:

```ts
enter({ context }) {
  const { fields, data, source } = context as {
    fields?: unknown; data?: unknown; source?: unknown;
  };
  if (!Array.isArray(fields) || !isObject(data) || !isObject(source)) return null;
  return { nodes: fields as FieldLike[], cursor: { data, source } };
}
```

Three forced conversions and one hand-written check, repeated in every language. Wiring a language
to the wrong starting data is not a compile error anywhere; the only thing standing between that
mistake and a silent wrong answer is a run-time check the language's own author remembered to
write. Two of the engine's own fixtures did not write one, which is Q4.

**Why it is named here.** Issue #203 carries this one in its own body as the review finding still
open against the engine, to be settled "here or before".

**The decision.** Whether `Language<N, C>` gains a third type parameter for its context, or the
engine keeps `unknown` and publishes a narrowing helper languages are expected to use, or the
entry becomes two members so that refusal is typed separately from reading. Each answer changes
what a host has to write, which is why it is cheaper before a host exists.

---

## Q2 — What type is an address part where the engine carries it

**Status:** open.

**Background, because the defect is invisible without it.** Every translatable piece of text gets
an address, so a stored translation can be matched back to its source and an edit can be noticed.
An address reads `body.b1:cta.heading` — field `body`, the block with id `b1` of kind `cta`, its
`heading` field. Dots and colons separate the parts, so a part that contains a dot or a colon of
its own — a block id an editor chose, for instance — would make the address ambiguous. The plugin
escapes those characters before joining: `body.x\:cta\.heading`.

The plugin guards that with a type only one function can produce (`idPath.ts:53`, `:72`):

```ts
export type RenderedSegment = string & { readonly __brand: "RenderedSegment" };
export const renderSegment = (segment: PathSegment): RenderedSegment => { … }
```

An unescaped string cannot be used where an escaped part is required. That is the whole point of
the type.

**Where the guard is lost.** The engine declares its own address part with no such mark
(`contract.ts:18`, `:40`):

```ts
export type PathSegment = string | number;
export type IdPath = readonly PathSegment[];
```

A language escapes the part before handing it over — `PayloadFields.language.ts:1` imports the
plugin's `renderSegment` and uses it. The engine carries the part through as an ordinary string.
On the way back the plugin forces it to the guarded type (`walkAddress.ts:10`):

```ts
: (token as RenderedSegment)
```

**What it costs.** Today the invariant holds because both languages live in this package and both
call `renderSegment`. Once a host writes its own language, an unescaped part is forced into the
guarded type and produces an address that matches no stored record — with no error and no warning.
The symptom is translations that stop being found, far from the cause.

**The decision.** Either the engine stops accepting a bare string and takes a part only something
can mint, or the plugin stops forcing the type and validates an incoming address at the one place
`walkAddress` runs. The first moves the escaping grammar into the engine, which is the one thing
the engine has no opinion about today; the second keeps the engine ignorant and pays with a
run-time check.

---

## Q3 — Which tree does a crossing hand over, the source or the target

**Status:** closed on 2026-11-13. Re-verified against the code: every implementation hands over a
clone of the source. The finding below described the code before the placement mechanism landed,
and is kept for the record.

**Background.** A translation run has two documents: the source, holding the text in the original
locale, and the target, holding the translation. At a crossing — the moment one format hands a
piece of content to another — there is a choice of which document's copy to hand over.

- Hand over the source's copy, and whatever translation the target already held is discarded and
  rebuilt from the original.
- Hand over the target's copy, and the existing translation is kept and only amended.

**What the audit found.** One implementation hands over the source, two hand over the target, and
the contract says nothing about which is correct.

**Why no test catches it.** In the test harness the source and the target are the same object, so
both behaviours produce the same answer. The difference is invisible exactly where it would be
checked.

**The decision.** Which one the contract requires, and how it is stated so that an implementation
cannot quietly pick the other. Until then the author of a new language chooses by reading whichever
existing file they happened to open.

---

## Q4 — What must `enter` refuse, and who checks that it does

**Status:** moved to #203 on 2026-11-13. The behaviour below was verified against the code that
same day and still holds.

**The rule as it stands.** `enter` may return `null`, meaning "this starting data is not mine". The
engine turns that into `CannotEnterLanguageError`. That return is the only protection against a
language being wired to data belonging to another format.

**How it is actually honoured.** Three implementations validate and refuse. Two fixtures force the
type without checking anything (`src/traversal/__tests__/fixtures/prosemirror.ts:66`):

```ts
const { tree, embed } = context as { tree?: PmNode; embed?: EmbedResolver };
```

One goes further (`prosemirror.ts:68`):

```ts
cursor: { embed: embed ?? (() => null) }
```

Read plainly: if the handler for embedded blocks was not passed in, substitute a stub that declines
every embedded block. A wiring mistake therefore raises nothing. The walk translates the prose and
leaves everything embedded untranslated, and the first sign of it is somebody noticing untranslated
content later.

**The decision.** Whether refusal stays a `null` return that every implementer must remember, or
becomes something the engine can check — and what the engine's own fixtures are then obliged to
demonstrate, given that they are the worked examples a host will copy.

---

## Q5 — Where does "a plain string is one unit" live

**Status:** open. Verified against the code on 2026-11-13.

**What `textUnits` answers.** How a value is cut into pieces for translation. For a plain string
the answer never varies: the whole string is one piece.

**What is written.** That same answer appears in four implementations. Three of them also test
whether the string is blank:

```ts
if (value.trim() === "" || slot === undefined) return [];
```

— `src/traversal/__tests__/fixtures/lexical.ts:38`, `prosemirror.ts:44`, `payloadFields.ts:113`.

The contract already guarantees that a blank value was rejected earlier, by `isEmpty`. So the test
is dead, and its presence tells the next reader that the guarantee cannot be relied on — which is
the more expensive half of the problem.

**And `isEmpty` itself is not one thing.** The two shipped languages use the package's shared
helper. The two fixture hosts each carry a two-line copy with different behaviour: an empty list is
not blank to them (`fixtures/payloadFields.ts:109`).

**The decision.** Whether the engine supplies the plain-string answer and the blank test so no
implementation repeats either, or whether the contract's guarantee is stated firmly enough that the
three redundant tests can simply be deleted and the fixtures made to share one `isEmpty`.
