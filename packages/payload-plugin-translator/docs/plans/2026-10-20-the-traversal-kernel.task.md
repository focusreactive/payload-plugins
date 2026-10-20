# The traversal kernel, built standalone

Supersedes steps 3 and 7 of the §9 order of work in
[2026-10-18-the-rewiring.md](./2026-10-18-the-rewiring.md) — the in-place kernel phases 0–3
and 4–6. Step 2 landed as PR #184 (`1.0.0-next.1`) and PR #186.

The design this builds is already written and is **not** re-opened here: §4.2, §4.5 and §4.7
of [2026-08-21-translation-mechanism-kernel-extraction.md](./2026-08-21-translation-mechanism-kernel-extraction.md),
with ADR-7 … ADR-12. What is new is the *approach* (D1) and three decisions the design did
not have to take because it never had to stand on its own (D3, D5, D6).

## Requirements / Task restatement

Build the traversal kernel as a new, private, dependency-free package, with nothing wired
into the plugin. The plugin keeps running on today's `src/core` throughout.

The kernel drives recursion over nested content; a **traversal language** answers "where do I
descend, where is the text, and where does another language take over". The kernel ships
**zero** languages (ADR-11).

In scope: the contract, the registry, the walk, the crossing protocol with its depth cap and
cycle guard, path assembly across a crossing, target collection, write-back, and four example
languages written as test fixtures.

Out of scope: wiring anything into the plugin; the real Payload and rich-text languages;
hashing, provenance, providers, runners, strategies; publishing the package.

## What already exists — platform · installed · project · verdict

- **Platform / installed:** nothing. The kernel takes no dependency by construction.
- **Project:** today's `src/core/kernel/field-traversal/` is the walker to beat — it is read
  for its shape and left untouched. `src/core/kernel/lexical/` holds today's Lexical handling;
  the neutral part of it (root, children, `type: "text"`) informs the Lexical fixture, the
  Payload-specific part (`block` / `inlineBlock`) is the thing the crossing protocol replaces.
- **Verdict:** new code, in a new package. The reuse is of *design*, not of implementation.

## Decisions

**D1 — the kernel is built fresh, not generalised in place.** *Owner's decision.* The
committed sequence reached the same place by refactoring the live pipeline (phases 0–3) and
then stripping the Payload vocabulary out again (phase 6), which writes the same files twice.
It also works against ADR-11: a kernel grown out of Payload code keeps reaching for Payload
notions because they are already in scope, and then nobody outside can write a second
language.
*Rejected:* the in-place order, for the two reasons above. *Cost accepted:* two walkers
coexist until the swap, and the swap is a step of its own.

**D2 — its own package, marked private.** `packages/translator-core`, `"private": true`.
Private does two jobs: `multi-semantic-release --ignore-private-packages` skips it, so no
publishing plumbing is needed before we want it; and "no imports at all" becomes a package
boundary rather than a hand-maintained lint zone (today's zone is `oxlint.config.ts:32-71`
plus `src/core/no-payload-boundary.test.ts`).
*Rejected:* a folder beside `src/core` in the plugin — cheaper to start, but the rule stays a
lint rule, and everything moves again later anyway.

**D3 — four example languages, and they live in the tests.** Two shapes with schema outside
the data (Payload-like fields, Storyblok-like components) and two self-describing ones
(ProseMirror, Lexical). They are the test bench, not part of what the package ships: not
exported, and the real Payload language — written later, in the plugin — is **not** derived
from the fixture, because it needs `field.editor` parsing, the real `localized` rule and the
exclusion list, none of which a fixture has.
*Why four and not two:* the value is in the **second** language of each kind. The first proves
the contract can express a shape; the second proves the contract was not bent to the first.
*Rejected:* invented toy languages — they do not carry the three places where the contract can
fall short (a list whose element schema depends on the element, element identity, a crossing
that hands over a resolver).

**D4 — the first pair is deliberately mismatched.** Payload-like fields crossing into
ProseMirror, written before the matching pair. Two languages from one product would let a
product assumption pass unnoticed; two from different products cannot.

**D5 — rich-text granularity is chosen by the host, at language construction.** The contract
has `textUnits` return one unit per text node. Container mode, shipped in PR #186, is the
opposite cut: the whole container as a single unit with inline marks numbered into the text
(`<1>red</1>`), written back by parsing the numbers and rebuilding the container's children.
Today the choice sits *above* the language, in `src/core/translation-pipeline/translateContent.ts:51`,
keyed off the provider's declared capability.

Both cuts are knowledge only the rich-text language has — numbering marks and parsing them
back is its business. The *choice* between them is host policy. So the host composes the
language with the choice already made: `lexicalLanguage({ marks: "inline" })` against
`lexicalLanguage({ marks: "per-node" })`, settled at registration, when the provider is known.
`textUnits` keeps its signature and the kernel learns nothing about providers.
*Rejected:* threading a granularity option through the kernel — it puts a host concern in the
contract; and letting the language read the provider — it inverts the dependency.

**D6 — the engine is exported, not only the collector.** `collectTranslationTargets` is one
consumer; the fingerprint projection (`src/core/domain/content-projection/contentProjector.ts`)
is the second and keeps its own read-only walk by design (§4.3, to hash the pristine source
before any write). Two callers exist before the export does, which is what ADR-0002 asks for.

**D7 — a crossing names its next language from the context it was handed, never from its
caller.** There is no caller to ask: the kernel has no such notion. A language is handed an
opaque context at `enter` that names which language its embeds go to and carries the resolver
for them, and reads that name back when it builds a `Crossing` (ADR-8, ADR-9). One unchanged
rich-text language must therefore be able to drop its embeds into two different schema
languages in two different runs. AC6 is the only check that can fail on a hard-coded id.

## Acceptance Criteria

All commands run from `packages/translator-core` unless stated.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | The package exists, builds and type-checks | `bun run build` then `bun run check-types` | both exit 0 |
| AC2 | It depends on nothing | read `package.json`; `grep -rn 'from "[^.]' src \| grep -v "\.test\."` | no `dependencies`/`peerDependencies` block; the grep prints nothing |
| AC3 | A schema-outside language walks and collects | the Payload-like fixture over a document with a group and a polymorphic list | collected text equals the expected set, in document order |
| AC4 | A self-describing language walks and collects | the ProseMirror fixture over a `doc` with nested marks | same |
| AC5 | **The live defect** — text inside a block embedded in rich text is collected | `Payload → Lexical → Payload` over a fixture mirroring `apps/cms`'s `Posts.content` + `CtaBannerInlineBlock` | the block's `heading` and `description` appear as targets, with an `idPath` addressing them *inside* the rich-text field |
| AC6 | **The proving row** — one rich-text language, two different hosts | the same `lexicalLanguage` instance entered once from the Payload-like schema and once from the Storyblok-like schema | embeds land in the respective schema language; the Lexical fixture contains no schema-language id |
| AC7 | Nesting is unbounded in practice | a fixture five levels deep (`schema → rich → schema → rich → schema`) | every leaf at every level is collected |
| AC8 | **Unhappy path** — past the depth cap it reports and stops | a self-referential fixture with `maxDepth` set low | throws the kernel's nesting error naming the path; does not recurse to a stack overflow |
| AC9 | **Unhappy path** — a selected leaf with no text units is reported, not skipped | a leaf whose value no `textUnits` recognises, with `onUnhandled` passed | `onUnhandled` is called once with that leaf's `idPath`; no target is produced for it |
| AC10 | Write-back reaches the right element by identity, not position | collect over a document, reorder the elements of a list in the copy, then `applyTranslations` | each translation lands in the element with the matching id |
| AC11 | D5 holds: one language, two cuts | build the Lexical fixture twice, `{ marks: "inline" }` and `{ marks: "per-node" }`, over the same paragraph | the first yields one unit carrying `<1>…</1>`; the second yields one unit per text node; the kernel call site is identical |
| AC12 | **Scope guard** — the plugin is untouched | repo root `git diff --name-only origin/major/translator` | names no file under `packages/payload-plugin-translator/src` or `apps/` |
| AC13 | The rest of the repository is unaffected | repo root `bunx turbo run build`; in `packages/payload-plugin-translator` `bunx vitest run` | build exits 0; the plugin's test count matches the pre-flight baseline exactly |
| AC14 | Clean lint | `bunx oxlint .` | 0 errors |

## Pre-flight

Run against the untouched tree on 2026-10-20, branch `feat/translator-traversal-kernel` at
`46f6aa05` (`origin/major/translator`).

| AC | Command | Result now | Kind |
|---|---|---|---|
| AC1 | `ls packages/translator-core` | no such directory | **change** — fails now |
| AC2 | the grep | no such directory | **change** |
| AC3–AC11 | the fixtures | none exist | **change** |
| AC12 | `git diff --name-only origin/major/translator` | empty | **invariant** |
| AC13 | plugin `bunx vitest run` | *recorded below* | **invariant** |
| AC14 | `bunx oxlint .` | no such directory | **change** |

Plugin baseline (AC13), measured on this branch before any file was added:
`bunx vitest run` in `packages/payload-plugin-translator` → **151 files, 2107 tests, all
passing**. AC13 asks for that exact pair again at the end, since this step adds no plugin test
and removes none.

## Risk notes

- **Risk: low for this step, high for the one after it.** Nothing here can break the plugin:
  AC12 and AC13 are the guards, and the package is not imported anywhere. The behavioural risk
  — selection, write-back and fingerprint values — belongs entirely to the later swap, which
  keeps today's suite as its oracle.
- **The characteristic failure of building standalone is a kernel nobody can use.** D3 and D4
  are the counterweight: if a capability is not needed by one of the four fixtures, it is not
  written.
- **The second characteristic failure is a fixture mistaken for an implementation.** The
  fixtures are deliberately thin on host detail; D3 records that the real Payload language is
  written from Payload's config, not from the fixture.

## Human choices

- Build the kernel standalone and additively, rather than generalising in place — owner,
  2026-10-20.
- Four languages rather than two, with combination runs and the nested
  `Payload → Lexical → Payload` case — owner, 2026-10-20.
- A private package rather than a folder inside the plugin — owner, 2026-10-20.

## Decisions taken during execution

**E1 — the implementation sketch hard-codes the language it returns to, and D7 forbids it.**
§4.7's rich-text language ends `boundary` with `return { language: "payload", ... }`, and builds a
Payload-shaped context around `fields`. Both halves are wrong for the same reason: a language that
names its successor, or assembles that successor's context, can serve exactly one host.
*Taken:* the host hands the rich text **one function** — given an embed's name and data, return the
whole `Crossing`. The rich text names nothing and assembles nothing; it passes through what it was
given. Found while writing the second schema language, which needs a differently-shaped context
(its field list comes from a name the data carries, not from a list handed in).

**E2 — `Language<never, never>[]` does not compile.** §4.2 types the registry's input that way. A
concrete `Language<FieldLike, SchemaCursor>` is not assignable to it: method parameters relate
bivariantly, but `enter`'s return type is covariant and `readonly FieldLike[]` is not a
`readonly never[]`. Verified with a compiler probe before writing anything.
*Taken:* `RegisteredLanguage = Language<unknown, unknown>`, which a concrete language is assignable
to. The kernel only ever hands a language back the nodes and cursor that language itself produced,
so nothing it does depends on what they are.

**E3 — a node contributes a *sequence* of address tokens, not one segment.** §4.2 gives each child
and each value a single `segment`. A keyed collection contributes two at once — its own name and
the identity of the element — so `sections.a.heading` was coming out as `a.heading`.
*Taken:* `segments: PathSegments` (possibly empty) in place of `segment: PathSegment | null`. The
`null` case disappears with it: contributing nothing is an empty sequence. **Found by a test, not
by reading** — the first address assertion written is the one that failed.

**E4 — "zero claimants is a reported error" cannot be read literally.** ADR-8's fallback rule says
exactly one language must claim a value. But `claims` is consulted on every leaf the current
language left as a value, and nothing else says such a value is a boundary at all, so zero
claimants is the ordinary case for every plain string.
*Taken:* zero claimants means an ordinary leaf; two or more raise `AmbiguousClaimError`, at walk
time rather than registration time, since a claim depends on the value. A claimed crossing carries
an empty context, which is the honest consequence: a host that cannot declare a boundary also
cannot hand over a resolver.

**E5 — the depth cap counts crossings, and five levels of rich text is ten of them.** With
`DEFAULT_MAX_DEPTH` at the 8 the design's wiring example uses, the deep fixture trips the cap.
*Taken:* the default stays 8 and the deep fixture passes its own `maxDepth`. How deep is worth
walking is the host's knob, and a fixture deeper than any real document should have to say so.

**E6 — one error class per file.** `max-classes-per-file` is an error in this repository's lint
configuration, and the plugin already keeps its error family one-per-file under `errors/` with a
barrel. Followed, rather than suppressed.

**E7 — AC13's "build exits 0" was unmeetable, and the pre-flight missed it.** `bunx turbo run
build` fails on `major/translator` **before this change**: `apps/dev` has two committed type errors
(`src/payload.config.ts:161`, `SeoFieldPaths` has no `content`; and `vitest.integration.config.ts:21`).
Proven by removing this package from the tree, restoring the lockfile, reinstalling and reproducing
both errors unchanged.
*Taken:* AC13 is met as "no worse than the baseline" — 15 of 17 tasks succeed, the same two fail for
the same two reasons, and `bunx turbo run build --filter='./packages/*'` is green for all 13
packages. The pre-flight should have run the repo build on the untouched tree and did not; that is
the defect in the contract, not in the change.

**E8 — a boundary must apply its own language's selection rule, because the crossing is decided
before `selects`.** The collector asks for a crossing first and only then asks whether the leaf is
selected, so a rich-text field its host never marked for translation was crossed into anyway, and
the guest — which selects everything, there being nothing to select on inside prose — collected the
whole field.
*Taken:* the fix belongs in the language, not the kernel. Checking `selects` before `boundary` would
mean rich text is **never** crossed, because a rich-text field is deliberately not in the
translatable set: the boundary is what handles it. So `boundary` returns null for a field its host
did not mark. Two checks pin it, one for unmarked and one for excluded.
*Found by review, not by the suite:* every fixture happened to mark its rich-text fields, so nothing
distinguished the two.

**E9 — a claim may not overrule a language that declares boundaries.** ADR-8's fallback is "for a
host that cannot declare". Consulting `claims` whenever `boundary` merely *returned null* is a
different rule, and a damaging one: it was the reason E8's fix did not take at first. The Lexical
fixture claims any tree with a `root`, so a field the Payload language had just declined was
immediately claimed and crossed anyway.
*Taken:* `claims` is consulted only for a language that declares **no** `boundary` at all. A
language that declared none *here* has said no, and that answer stands. The contract says so on
`claims`, together with the two consequences a claimed crossing carries: it is walked and written in
place, and it gets no context, so it cannot reach what is embedded. A host that needs either must
declare.

**E10 — the crossing cap does not catch a cycle, and a cycle is reachable.** A value that
contains itself loops inside **one** language: no crossing happens, the counter never moves, and
the walk runs until the stack gives out. Found by reading a second, independent implementation of
this contract, which had a guard for it where this one did not.
*Taken:* the engine carries the nodes already stepped on the way to a position and refuses to enter
one twice. **The pair is compared, not the node** — a language whose schema lives beside the data
walks the same schema node once per element, and a node-only guard calls that a cycle. A field whose
own field list contains itself, walked over data that nests twice, is the case that tells the two
apart; it is a check, and a mutation that drops the cursor from the comparison turns it red.

**E11 — one level of nesting proves nothing about the second.** The embedded-block fixture reached
a block inside rich text and stopped at its plain fields, so address assembly *after* a crossing and
*into a container* was never exercised. An array inside the embedded block now carries it:
`["content", 1, "actions", "a1", "label"]`.

**E12 — test files are split by the question they answer, and live apart from the kernel.** Three
files holding thirty-six checks became fifteen named after their angle — `crossing.depthCap`,
`walk.cycleGuard`, `applyTranslations.twoDocuments`, `crossing.twoHosts` — so a red run names its
own subject before the file is opened. All of it, suite and fixtures alike, sits under
`src/__tests__/`, which the build and the type-check exclude as one path: *owner's call*, and the
reason is that fifteen test files beside five shipped ones turns a directory listing into noise.
The shared walks live in `src/__tests__/fixtures/harness.ts`, so each file shows its own case.

**E13 — a negative assertion needs a positive anchor in the same check.** Twenty-one of the
thirty-six checks were written after the code worked, so a suite audit stubbed the collector with an
**empty** implementation — one that returns no targets and writes nothing — and ran everything
against it. **Eight checks stayed green**, every one of them an assertion that something was
*absent*: `toEqual([])` for a rich text the host never marked, `not.toContain` for a field the
language declines, an unchanged document after a refused reply, a callback that was not called.
Absence is what an empty implementation produces for free.
*Taken:* each of the eight now also asserts what the walk **did** collect — a marked sibling field,
the siblings of the empty leaf, the length of the target list before a reply is refused. The point
of each check is unchanged; what changed is that it can now fail. On the second audit run all
thirty-six go red.

**E14 — the engine comes out of the public surface, overturning D6.** D6 exported `walkLanguages`
and its three types on the grounds that the fingerprint projection would be a second consumer. That
consumer lives in the plugin, which this step does not touch, so by the repository's own rule —
a future caller counts only when it traces to a requirement in scope — the export was speculative.
Two consumers were written against the barrel and type-checked (a language author with its helpers
extracted, and a host running one translation with a named handler and error handling); between
them they name twelve of the twenty-three exports.
*Taken:* the engine (`walkLanguages`, `DEFAULT_MAX_CROSSINGS`, `LeafVisit`, `Visitor`,
`WalkOptions`), the shape internals reachable through `Step` (`StepChild`, `PathSegments`) and
`CollectOptions` come out. Fifteen names remain. The direction is deliberate for a package that is
about to be published: **adding an export later is not a breaking change, removing one is**, so the
strict choice now is the cheap one. If the projection needs the engine at the swap, it is one line.

**E15 — the published contract is documented to the property, and that is not a reversal of the
comment audit.** The audit cut forty blocks from this same file. It was right, and so is this: the
reader changed. A maintainer has the code, the suite and the design docs; a consumer of an npm
package has a hover tooltip and nothing else. What survives from the audit is the standard, not the
verdict — every line still has to say something the signature cannot. So the docs carry what a
type cannot: that `IdPath` is **not unique** when a leaf yields several units; that `boundary` is
consulted before selection, which is why a language that translates only part of its content must
apply that rule there too; that a short answer list is an ordinary outcome rather than an error;
that `claims` is only for a language declaring no boundary at all, and that a claimed value is
written in place. Tag names follow what this repository's linter accepts — `@default` rather than
`@defaultValue`, `@template` rather than `@typeParam`, no `@packageDocumentation`.
*Not documented, deliberately:* `enter`'s inline parameter object and its return shape, which are
covered by `@param args.*` and `@returns` on the method — the standard form, and what an editor
shows.

## Review log

### 2026-10-20 — comment audit

56 comment blocks judged, every one of them: 40 deleted, 6 shortened, 10 answered by changing the
code, 0 kept, 3 missing ones added. 137 comment lines became 14.

Three of the deletions were not verbosity but **false statements**: `step` was described as the only
place content is read (five other members read it); the schema cursor promised pairing by identity
alone (the code falls back to position); and the crossing cap's example was off by one
(`schema → rich text → schema` is two crossings, not three).

What the code now says instead of prose: `maxDepth` → `maxCrossings` with
`DEFAULT_MAX_CROSSINGS` and `TooManyCrossingsError`; `select` → `filter`, which can only narrow;
`onUnhandled` → `onSelectedWithoutText`; `claimants` → `otherClaimants`;
`crossingAt` split so `declaredCrossing(visit) ?? claimedCrossing(visit)` carries the precedence;
`MarkMode "per-node" | "inline"` → `UnitCut "per-text-node" | "whole-container"`; and a named
`hasStrayText` with the check it needed. The duplicated mark codec in both rich-text fixtures became
one shared helper.

### 2026-10-20 — fresh eyes on the code, one reviewer (low risk)

Five findings. Three accepted (E8, E9, and the stray-text check below), one refused, one left open.

**Refused — "`applyTranslations` should throw when the counts differ."** A short reply is a
*designed-for* case, not an error: F1 in [the rewiring](./2026-10-18-the-rewiring.md) exists because
a model may answer with fewer values than it was sent, and the applier leaving those targets alone
is what makes that survivable. A throw would turn the ordinary case into a failure. A reply *longer*
than the target list is a caller defect, but guarding it is speculative until a caller exists.

**Left open — the context a language is entered with is `unknown`, and every fixture casts it.** A
wrong-shaped context produces a `TypeError` inside `step` rather than a named error. Whether the
contract should offer a way to reject a context is a design question wider than this step; it is
recorded here rather than answered.

### 2026-10-20 — mutation runs

Three rounds. The first broke twelve behaviours one at a time; eleven turned exactly the expected
checks red and one — removing the `isEmpty` guard — **turned nothing red**, so `isEmpty` was part of
the published contract with nothing proving it was honoured. A check was added and the mutation
re-run.

The second round, after the comment audit's code changes, broke fifteen; fourteen discriminated.
The one that did not was the stray-text check added minutes earlier: a second check, on the number of
pieces, was masking it. The reply in that case was rewritten to carry the right number of marks and a
stray tail, so only the rule under test can refuse it.

The third round, over the finished code, broke sixteen, including the two guards E8 and E9 added.
**All sixteen discriminate.** The most load-bearing: hard-coding the host's id inside the Lexical
fixture turns exactly one check red — the one where one unchanged rich-text language is entered from
two different schema hosts.

### 2026-10-20 — adopted from a second implementation of the same contract

The same contract was built independently by another agent runner, and the two were compared
afterwards. Its suite was measured the same way as this one: thirteen mutations over its code, all
thirteen discriminating. Three things came back from it, recorded above as E10, E11 and E12; the
first is a defect it did not have and this one did.

Two of its choices were examined and **not** taken. Its `TextUnit.write` is optional, and that
optionality is why its container-mode rich text can send a marked string but never write the reply
back — the shape permitted the gap and nothing noticed. Its leaf address is a joined string rather
than a sequence, which reads better in a test and is worse for provenance, which has to compare
addresses rather than print them.

A fourth thing it did — omitting the claim fallback entirely — is the open question E9 touches and
is left with the owner.

### 2026-10-20 — suite audit against an empty implementation

Fifteen of the thirty-six checks had been red against stubs when the kernel did not yet exist. The
other twenty-one were written afterwards and had only mutation evidence, which answers a different
question: a mutation proves a check can tell one defect from its absence, an empty implementation
proves the check has a subject at all.

One stub, one alternate runner config, two runs. First run: 28 red, **8 green** — listed in E13 and
all of them negative assertions. After anchoring: 36 red, 0 green. The seventeen mutations were then
re-run over the anchored suite and all seventeen still discriminate.

Cost, counted rather than estimated, since the tests already existed: **2 doubles in the whole
suite** — both `vi.fn()` standing in for a callback the contract declares — **0 assertions reaching
a private name**, 0 type escapes, median file 41 lines. Nothing here is near the territory where a
suite becomes the expensive part.

Scaffolding (`__stubs__/`, `vitest.red.config.ts`) removed and confirmed gone from `git status`.

### Gates

- `sp-plan-check task` — clean.
- `sp-diff-checks --mode working` — clean, 5 checks, no findings.
- `sp-lint-delta` — no findings introduced.
