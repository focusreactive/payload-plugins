# Receipts in one read, and the store reaches the routes

Build step: 2026-11-18-the-server-reads-the-state.design.md #7

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

A page of list rows needs the records of up to a hundred documents, and the store reads one
document per call. It also needs to be reachable at all: the provenance wiring keeps its factories
closed over, so the module that will hold the two read routes cannot see them.

## Requirements

Requirement ids are the definition's, as the design's build sequence assigns them to this step.

- R2 (in, partial) The list answer costs one records read for a page, not one per row. The route
  itself is the next step.
- Ra (in) The module that holds the read routes can reach the records store and the staleness
  service, and can tell that this installation keeps no records.
- Rb (out) Both routes, and what they do with any of this.

## Decisions

**D1 — the batched read is optional on the port, with the fallback beside it.** `ProvenanceStore`
is reachable in type position from the published graph, so a required method would break an outside
implementation on upgrade. `receiptsByDocument` asks for the batched method and falls back to one
read per document, so a caller never branches on it. Rejected: requiring the method, and leaving
the fan-out at every call site.

**D2 — the grouping belongs with the fallback, not with the caller.** Both paths return a flat list
of records, and every caller wants them by document; returning the flat list would have each caller
write the same grouping.

**D3 — the factories travel on the existing context, not a new composition file.** The module reads
`ctx.provenance`, exactly as it already reads `ctx.runRecordStoreFactory`. The field is optional,
and absent means this installation keeps no records — which the compiler makes the handler deal
with rather than a runtime check nobody wrote.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R2 | The records of N documents cost one adapter call | `bunx vitest run src/server/modules/provenance/__tests__/Provenance.store.test.ts` | one `find`, with the ids in one `in` clause |
| AC2 | R2 | A store without the batched method still answers, one read per document | `bunx vitest run src/core/domain/provenance` | the fallback case passes, two reads for two ids |
| AC3 | R2 | Nothing is read where no document was asked about, and a document with no record is absent rather than empty | same suites | both cases pass |
| AC4 | Ra | A module sees the records where the installation keeps them, and sees nothing where it does not | `bunx vitest run src/server/modules/plugin-config` | both boot cases pass |
| AC5 | — | No new type errors | `bun run check-types` | 0 errors |
| AC6 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC7 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree (HEAD = the run's locales), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — the store has no batched method | change |
| AC2 | **FAIL** — there is nothing to fall back from | change |
| AC3 | **FAIL** — as above | change |
| AC4 | **FAIL** — the context has no such field, and the wiring keeps its factories closed over | change |
| AC5 | **PASS** — 0 errors | invariant |
| AC6 | **PASS** — 2904 passed, 15 skipped | invariant |
| AC7 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | one `find` for three ids, asserted on the where |
| AC2 | met | two reads for two ids through the fallback |
| AC3 | met | the empty-ids and absent-document cases pass on both paths |
| AC4 | met | the two boot cases pass |
| AC5 | met | 0 errors |
| AC6 | met | 2914 passed, 15 skipped — ten more |
| AC7 | met | 26 warnings, 0 errors |

## Risk

**Low, with one published surface touched.** The port gains an optional method, which is additive
for an outside implementation, and the context gains an optional field, which is additive for a
third-party module. Nothing existing changes behaviour.
