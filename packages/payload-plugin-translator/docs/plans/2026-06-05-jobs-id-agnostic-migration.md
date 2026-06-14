# Jobs ID-Agnostic Migration (expand/contract)

**Date:** 2026-06-05
**Status:** ✅ Shipped (0.3.0 / PR #18) — the deprecated relationship fallback is removed in the next major
**Related:** [Foundation Prep Plan](./2026-06-05-foundation-prep-plan.md) · [Deprecations Ledger](../DEPRECATIONS.md#jobs-input-collection-field)

## Overview

Make document IDs string-agnostic throughout the plugin and remove the only boundary that forces a
native ID type: the Payload `relationship` field used to store the document reference inside the
translate task input. Done as a **non-breaking minor** via expand/contract, with the relationship
field kept as a read-only fallback for jobs queued before the change.

## Problem

The task `inputSchema` stores the document reference as a polymorphic `relationship` field
(`{ relationTo, value }`). Two consequences:

1. **Write-side validation.** A relationship field validates the stored `value` against the target
   collection's ID type. The enqueue HTTP boundary coerces every id to a string
   (`z.coerce.string()`), so a string id reaches a number-id collection, fails validation, and the
   job hangs in `processing` without ever invoking the handler.
2. **Query-side type mismatch.** The value lands in a JSON column; on SQLite `input->>...->>'value'`
   preserves the JSON type and `IN`/`=` does not coerce TEXT↔INTEGER, plus drizzle inlines
   numeric-looking strings unquoted. This is why `findByCollection` already filters in memory.

### Where string IDs are and aren't safe

- **Against a collection's real PK** (`payload.findByID({ id })`, `where: { id }`): safe — Payload
  coerces the string to the column's native type. Our downstream `findByID` calls
  (`translate-document/handler.ts`) are fine with strings.
- **As a value inside the relationship field** (our `input.collection.value`): unsafe — see above.

So the fix is not "coerce harder" but "stop routing the reference through a relationship field."

## Solution

Internal invariant: **`type ID = string`**, converted once at ingress, used as string everywhere in
plugin code. At the one external boundary that cannot stay string (the persisted job input), store
the reference as **plain text** instead of a relationship:

```ts
// before — inputSchema
{ type: 'relationship', name: 'collection', relationTo: collections, required: true }

// after — inputSchema
{ type: 'relationship', name: 'collection', relationTo: collections, required: false,
  admin: { readOnly: true, description: 'Deprecated. See docs/DEPRECATIONS.md#jobs-input-collection-field' } },
{ type: 'text', name: 'collection_slug', required: true },
{ type: 'text', name: 'collection_id',   required: true },
```

## Code sites

All in `src/server/modules/task-runner/payload-jobs-runner/` unless noted.

1. **`PayloadJobsRunnerProvider.ts` — inputSchema.** Add the two text fields; demote the relationship
   field to `required: false` + read-only (kept as fallback, not removed).
2. **`PayloadJobsRunnerProvider.ts` — handler input type + unpacking.** Read the new fields with a
   fallback: `collection_slug ?? collection?.relationTo`, `collection_id ?? collection?.value`.
3. **`PayloadJobsTaskRunner.ts` — `enqueue` write.** Write `collection_slug` / `collection_id`
   (strings). Stop writing the relationship field.
4. **`PayloadJobsTaskRunner.ts` — `findByCollection` / `findJobsInternal`.** See "Query narrowing"
   below.
5. **`normalizeJob.ts` + `types.ts`.** Update `PayloadJob.input` shape and read with the fallback.

## Three non-obvious points

### 1. Drop `required` from the relationship field

If the relationship field keeps `required: true` while we stop writing it, **every new job fails
validation** — the same "silently stuck" failure from the other side. The relationship must become
`required: false`; `required: true` moves to the text fields.

### 2. Query narrowing must handle both shapes, not just the read path

A fallback in `normalizeJob` is only half the job. `findByCollection` also narrows the SQL query by
`input.collection.relationTo`. If that narrow switches to the new text path, **old jobs stop
matching and silently disappear** from cancel/status operations.

Fix: narrow the SQL query by `taskSlug` only (shared by both shapes) and filter by slug **and** id
in memory across both shapes. The plugin already filters `value` in memory (for the SQLite bug), so
extending the in-memory predicate to also cover slug + the legacy shape is no new cost.

### 3. Read-compat shim lives in `normalizeJob`

Jobs queued before the change carry only `collection: { relationTo, value }`. `normalizeJob` reads
new-then-legacy so both shapes normalize to the same `Task`. The shim is removed together with the
relationship field in the next major.

## Rollout

- **Schema change is additive** — two new nullable text columns on `payload-jobs`. sqlite `push` is
  automatic; postgres consumers generate a migration.
- **No user-facing change** — the job input shape is internal plumbing.
- **Major cleanup** — remove the relationship field, the fallback reads, and the legacy branch in the
  in-memory filter. Tracked in the [deprecations ledger](../DEPRECATIONS.md#jobs-input-collection-field).

## Tests

- enqueue writes text fields for both number-id and string-id collections; relationship field not written.
- `findByCollection` returns jobs stored in **both** shapes (legacy relationship + new text), filtered correctly by slug + id.
- `normalizeJob` normalizes both shapes to identical `Task` output.
- regression: a number-id collection round-trips enqueue → pickup → handler without hanging.

## Open questions

- Keep the relationship field strictly read-only in admin, or hide it entirely (`admin.hidden`)?
  Leaning read-only so legacy jobs stay inspectable.
