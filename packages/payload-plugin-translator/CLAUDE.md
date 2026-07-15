# payload-plugin-translator — Agent Guide

Package-specific conventions for `@focus-reactive/payload-plugin-translator`.
Complements the root [CLAUDE.md](../../CLAUDE.md) — it does not replace it.

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
(`slugGuard.ts`, `staleness.ts`) stay untagged. The tag is for role-bearing units, not every file.

**Structural Payload-type slices (`.shapes.ts`).** Functions/classes must not depend on
Payload's god types (`Config`, `CollectionConfig`, …). Define a narrow structural interface with
only the fields you touch — the real Payload type is assignable to it (structural typing), so it
"plugs in" with no adapter and tests pass a tiny literal. Full Payload types stay near the surface:
`plugin.ts`, `PluginConfigBuilder.applyTo`, the `ConfigModifier` contract (`types/ConfigModifier.ts`),
and HTTP route boundaries (`PayloadRequest`) — not in leaf helpers. See
`server/modules/provenance/Provenance.shapes.ts`.
