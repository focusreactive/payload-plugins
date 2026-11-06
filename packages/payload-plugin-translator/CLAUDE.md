# payload-plugin-translator — Agent Guide

Package-specific conventions for `@focus-reactive/payload-plugin-translator`.
Complements the root [CLAUDE.md](../../CLAUDE.md) — it does not replace it.

## What goes into `src/index.ts`

**Only what a consumer outside the package cannot do their job without naming.** Before
adding a re-export, write the consumer in a scratch file and type-check it: contextual
typing from an already-exported interface covers object literals, callbacks and return
positions, so a type the contract merely *mentions* usually needs no export at all. A test
or fixture in this repository is not a consumer — it has internal import paths.

See [ADR-0002](../../docs/adr/0002-publish-only-what-a-consumer-must-name.md) for the three
questions and the case that produced them.

## What goes into any other `index.ts`

The same test, one level down: **a barrel re-exports only what is used outside its own
module.** Everything else stays inside, and siblings import each other by path.

- *Outside* means a file that is not under the barrel's own directory. A sibling importing a
  sibling does not go through the barrel, and a test under the module's own `__tests__/` is
  inside it.
- A name may be listed for a consumer that does not exist yet **only** when that consumer is
  a designed, documented next step that names it. "Someone might" is not one — it waits.
- Adding a name later is not a breaking change; removing one is. The cheap direction is to
  start narrow.

The check is mechanical, so run it rather than reasoning about it: find every file that
imports *from the barrel's path*, collect the names those imports take, and subtract. What is
left is surplus. Counting references to a name across `src/` does **not** answer this — it
matches the defining file, the barrel itself, and every sibling that imports by path.

Why it matters beyond tidiness: a barrel that re-exports everything turns every internal name
into a commitment, so a rename inside the module becomes a cross-module change, and a reader
can no longer tell the module's face from its insides.

`src/index.ts` is this same rule at its strictest, because there the outside is every
consumer of the published package; it has its own section above.

## Documenting feature versions

Annotate every new piece of **public API** (anything re-exported from
`src/index.ts`) with the version it ships in:

- `@since x.y.z` in its JSDoc, and
- a `Since vX.Y.Z` note in `README.md` next to the feature.

So a reader can tell at a glance whether their installed version has the feature —
without cross-referencing the changelog. (The pain this avoids: "the docs show it,
but my version doesn't have it — why can't I use it?")

Determine the version deterministically from the latest published tag + the highest
bump in the change — e.g. a `feat` on `0.4.0` → `0.5.0`. When it isn't obvious, run
`bun run multi-semantic-release --dry-run` (from the repo root) to read the exact
"next release version".

Scope:

- Applies to **additions**. Deprecation/removal targets stay `next major` per
  [docs/DEPRECATIONS.md](docs/DEPRECATIONS.md) — we don't guess removal versions.
- Don't backfill `@since` on pre-existing API; the practice starts from the change
  that introduces it.

## Design docs

Non-trivial work is designed in a committed doc under [docs/plans/](docs/plans)
before implementation. Deprecations are tracked in
[docs/DEPRECATIONS.md](docs/DEPRECATIONS.md) (keyed by date + PR, removal = next major).

## Grouping files inside a module

Three things name a file, and each answers a different question. Read together they are meant to
tell you what a file holds before you open it.

| Layer | Answers | Example |
| ----- | ------- | ------- |
| the folder | what role the file plays | `stages/`, `errors/`, `wire/` |
| the filename | what it is about, and whether it is a thing or a doing | `TranslationMutator.ts` · `narrowSelection.ts` |
| the role tag | what it plugs into outside itself | `.provider.ts`, `.stage.ts` — see the next section |

### The folder names the role

A module that outgrows a flat listing is split into **folders named by role**, the same vocabulary
the client half already uses (`client/entities/translation/{api,model,ui}`), not by domain concept.
A folder called `owed/` or `job-row/` has to be opened before it tells you anything; `model/` and
`store/` do not.

| Folder | Holds | Test |
| ------ | ----- | ---- |
| `domain/` | the rules that decide | does it decide something, reading shapes it does not define? |
| `model/` | the same, one module or client slice down — budgets, plans, what is still owed | as above |
| `store/` | the shape of what a framework or database stores, and the readers that turn it into ours | would it change if Payload changed its storage format? |
| `wire/` | the shape our values take to cross to someone else, and the reading back | would it change if the other side changed? |
| `stages/` | translation-pipeline steps | does it have `execute(ctx)`? |
| `errors/` | error classes, one per file — oxlint allows no more | — |
| `types/` | shapes only | is there a single function in here? |
| `api/` · `ui/` | client-side: talking to the server · React | — |
| `config.ts` | the module's options and the config resolved from them | — |

**`shared/`, `utils/`, `lib/`, `helpers/` and `common/` are not roles.** A folder under one of those
names may hold nothing but further role folders — `client/shared/ui/` is fine, because `ui` carries
the role. A flat pile of behaviour under such a name is the defect this section exists to prevent:
the folder stops answering, and each filename is left to carry the whole load alone.

**The dependency runs one way: `model/` → `store/`, `domain/` → `wire/`, never back.** That is what
makes the split worth having rather than two arbitrary piles, and it is checkable with one grep.

Each folder carries an `index.ts`; cross-folder imports go through it, imports inside a folder and
from a test to the unit it tests go direct. `server/modules/task-runner/payload-jobs-runner/` is the
worked example. A module small enough to read at a glance stays flat — `sync-runner/` has four files
and needs none of this.

### The filename names the subject, its case names the shape

- **`PascalCase.ts` holds a thing** — one class or one named type, exported under the file's own
  name: `TranslationMutator.ts`, `PipelineContext.ts`, `SourceFingerprint.ts`.
- **`camelCase.ts` holds doing** — either one function named exactly as the file
  (`narrowSelection.ts`, `admitWork.ts`, `computeSourceFingerprint.ts`), or a few functions about
  one subject, named for that subject (`staleness.ts`, `sections.ts`).

A `camelCase.ts` whose functions are about two subjects is two files. A `PascalCase.ts` exporting
several unrelated types is a `types.ts` in a role folder.

## File naming — role tags

Files carry a **role tag** as a dotted suffix: `<Domain>.<role>.ts` with a PascalCase
domain base (e.g. `Provenance.service.ts`). The tag names *what kind of thing* the file is,
so a directory listing reads as an architecture map. Extend this vocabulary rather than
inventing a parallel scheme.

| Role | Tag | Example |
| ---- | --- | ------- |
| Framework-agnostic port / abstract contract (in `core/`) | `.interface.ts` | `ProvenanceStore.interface.ts` |
| Domain / policy service | `.service.ts` | `Provenance.service.ts` |
| Payload adapter implementing a port | `.store.ts` (or a role word for the port kind) | `Provenance.store.ts` |
| Payload collection factory | `.collection.ts` | `Provenance.collection.ts` |
| Payload hook | `.hook.ts` | `ProvenanceCleanup.hook.ts` |
| Config-time wiring (`configure(ctx) → ConfigModifier`) | `.wiring.ts` | `Provenance.wiring.ts` |
| Narrow structural shapes (Payload-type slices — see below) | `.shapes.ts` | `Provenance.shapes.ts` |
| Translation-pipeline stage | `.stage.ts` | `DataReconciler.stage.ts` |
| Pluggable strategy / provider / factory | `.strategy.ts` · `.provider.ts` · `.factory.ts` | `Overwrite.strategy.ts` |
| Client RSC / admin boundary | `.export.tsx` · `.server.tsx` · `.client.ts` | `TranslateDocument.server.tsx` |

Not everything is tagged: `index.ts` barrels, and small **pure helpers** named by topic
(`slugGuard.ts`, `staleness.ts`) stay untagged. The tag answers *what this file plugs into
outside itself* — a framework, a named port, the admin boundary — so it lands on roughly one
file in eight. Everything else is named by the section above.

**Structural Payload-type slices (`.shapes.ts`).** Functions/classes must not depend on
Payload's god types (`Config`, `CollectionConfig`, …). Define a narrow structural interface with
only the fields you touch — the real Payload type is assignable to it (structural typing), so it
"plugs in" with no adapter and tests pass a tiny literal. Full Payload types stay near the surface:
`plugin.ts`, `PluginConfigBuilder.applyTo`, the `ConfigModifier` contract (`types/ConfigModifier.ts`),
and HTTP route boundaries (`PayloadRequest`) — not in leaf helpers. See
`server/modules/provenance/Provenance.shapes.ts`.
