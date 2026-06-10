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
