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

*(filled during the work)*

## Review log

*(filled during the work)*
