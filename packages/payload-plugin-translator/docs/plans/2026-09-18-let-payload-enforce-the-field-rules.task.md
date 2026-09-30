# Task contract — let Payload enforce the field rules

Follows the access-control work on `fix/translator-access-control` (PR #144, five commits). That
change made translated writes respect the host's access rules. This one removes the half of it that
re-implements what Payload already does.

**Risk: HIGH.** It moves a security boundary, changes what reaches the database on the path that runs
inside an editor's save, and deletes code three review rounds and two adversarial passes were spent
correcting.

## The finding

The plugin asks Payload's evaluator which fields the requester may write, walks that answer into
dot-separated paths (`deniedPaths`), and prunes those paths out of the payload before writing
(`dropPath`, `withoutDeniedFields`).

Payload already does exactly this, at the write:

```js
// fields/hooks/beforeValidate/promise.js:216-226
if (field.access && field.access[operation]) {
    const result = overrideAccess ? true : await field.access[operation]({ … });
    if (!result) {
        delete siblingData[field.name];
    }
}
```

Its own traversal, over its own field tree, handling groups, arrays, tabs and blocks natively — and
it **deletes**, it never throws. The plugin's walk is a second implementation of that rule against a
different input (the sanitized permissions object rather than the access functions), which is why it
took four rounds of corrections to approximate: blocks live under `blocks` not `fields`; an absent key
means refused; row identity must never be pruned; a leaf's value must not be walked. Every one of
those was the copy disagreeing with the original.

The only reason the copy exists is `killTransaction`: the inline path runs inside the editor's save,
so `enforcedAtTheWrite` withholds `overrideAccess: false` there and the plugin enforces instead.

**That fear is half-founded, and the half that matters is the other one.** A *collection*-level
refusal throws — `executeAccess` raises `Forbidden`, which reaches `killTransaction`. A *field*-level
refusal does not throw at all.

## Evidence

Measured before designing, on PostgreSQL, which is the only adapter where the inline path carries a
transaction at all (on SQLite and Mongo it does not, so an access regression is invisible there).

The probe hands Payload `overrideAccess: false` on **every** path including the inline one, and
disables the plugin's pruning entirely:

```
integration, PostgreSQL, the six access-control specs   13 passed / 13
integration, PostgreSQL, whole suite                    154 passed / 39 files
plugin unit suite                                       1602 passed, 6 failed
```

The six unit failures are exactly the checks that assert the behaviour being removed — three in
`handler.prune.test.ts`, two in `handler.access.test.ts`, one in `handler.enforce.test.ts`. Nothing
else in 1608 depends on it.

What the integration result proves, case by case:

- `access-control.int.test.ts` — the field rule on `title` was honoured with the plugin pruning
  nothing, so **Payload dropped the field**.
- the same file's "save survives" case passed, so a field refusal inside the editor's transaction
  **does not roll the save back**.
- `access-control-blocks.int.test.ts` — a rule declared inside a block was honoured natively, without
  the `blocks` walk that took a round of review to get right.
- `access-control-collection.int.test.ts`, `-locale`, `-queue`, `-unattributed` — unchanged.

## Decisions

**D1 — Payload enforces the field rules, on every path.**
`overrideAccess: false` + the rebuilt requester goes on every write the plugin makes, inline included.
Rejected: keep the plugin's walk. It is a second implementation of a rule this framework owns, it has
been wrong four times in four different ways, and the probe shows the original handles every case it
was patched to handle. Cites: `beforeValidate/promise.js:216-226` and the probe above.

**D2 — the pre-check stays, and shrinks to one question.**
"May this requester update this document?" — nothing about fields. It exists for exactly one reason:
a collection-level refusal *does* throw, and on the inline path that throw would take the editor's
save. Asking first means the write never reaches it. Rejected: drop the pre-check and let Payload do
everything — that is precisely the `killTransaction` hole the original work was built to close, and
it is still open at the collection level.

**D3 — D12 of the earlier contract is superseded.**
"A refused field costs that field, not its branch" stays true as *behaviour* — it is now Payload's
behaviour rather than the plugin's. Its recorded caveat ("inside a `blocks` field a refusal is
remembered by field name, not by block type", CONTEXT.md) disappears with the walk: Payload matches
the actual block. That parked follow-up is closed by deletion rather than by a fix.

**D5 — ask again with the payload each write actually sends.**
Added after the complexity audit measured a hole the first three decisions opened. The pre-check is
fed the **source** document; Payload evaluates the same collection rule at the write, where `data` is
the **partial translated payload** (`updateByID`: `executeAccess({ id, data, req })`). A rule reading
`data` answers differently to the two, and now that the inline write carries `overrideAccess: false`,
that disagreement is a `Forbidden` inside the editor's transaction — their save, gone.

Measured on PostgreSQL with `update: ({ data }) => data?.ref === "open"`:

    with the reduction as first written   Forbidden, the editor's save lost
    with the previous behaviour           the save survives

So each write asks once more, with exactly what it is about to send, while a refusal still costs only
the translation. The publish write asks about its own `{ _status }` for the same reason. Rejected:
feed the pre-check the translated payload instead of the source — it runs before `translateContent`
precisely so a refusal buys no completion, and moving it after would give that up. Rejected: catch
`Forbidden` at the write — by then `killTransaction` has already fired.

`mayWrite` is the second ask, taking an already-rebuilt requester so several writes share one lookup.

**D4 — what a refusal costs at the provider is unchanged.**
The check still runs before `translateContent`, so a collection refusal still buys no completion. A
field refusal costs one completion, exactly as it did before (the old code also translated first and
pruned after).

**Placement:** no new file. `translationPermission.ts` loses roughly half its body;
`translate-document/handler.ts` loses three helpers; `RequestScope.shapes.ts` is untouched by this
task beyond what it already carries.

**New surface:** none.

**Written contract owed:** `TranslationPermission` drops `deniedFields`, so the path-format contract
("dot-separated, no row indices") goes with it. Nothing new is owed.

**Escalate to /sp-architect?** No. One module, no new seam, no data-model change — it removes a seam.

## What is deleted

`deniedPaths` · `dropPath` · `withoutDeniedFields` · `STRUCTURAL_KEYS` · `REFUSE_EVERY_FIELD` ·
`Grant` · `FieldPermission` · `FieldPermissions` · `BlockPermissions` · `isGranted`'s field-walking
callers · `TranslationPermission.deniedFields` · the `_status` publish gate's reliance on it.

Tests that go with it, because they test deleted code rather than lost behaviour:
`handler.prune.test.ts` (4), the pruning cases in `handler.access.test.ts` (2), the field-walk cases
in `translationPermission.test.ts` (~10), `access-control-blocks.int.test.ts` (1, now covered by
Payload's own traversal — but see AC 4).

## Acceptance criteria

1. **A field rule is still honoured on the inline path.** `access-control.int.test.ts`, the denied
   field keeps its existing target-locale value after a source publish.
   *Check: `DB_ADAPTER=postgres` integration run.* Passes now and must keep passing.
2. **The editor's save still survives a field refusal inside their transaction.** Same file, the
   "save survives" case. *Check: same run.* Passes now and must keep passing.
3. **A collection-level refusal still refuses, with the catalogued reason and before the provider is
   paid.** `access-control-collection.int.test.ts` plus `handler.spend.test.ts`.
   *Check: integration on PostgreSQL + unit.* Both pass now and must keep passing.
4. **A rule declared inside a block is still honoured**, with the plugin's block walk gone.
   `access-control-blocks.int.test.ts` is kept, not deleted, precisely so this is proved by Payload
   rather than assumed. *Check: `DB_ADAPTER=postgres` integration run.*
5. **`deniedPaths`, `dropPath`, `withoutDeniedFields`, `STRUCTURAL_KEYS`, `REFUSE_EVERY_FIELD` and
   `TranslationPermission.deniedFields` are gone.** *Check: `grep -rn` over `src`, zero hits.* Fails
   now (that is the point).
6. **The unattributed bypass is unchanged** — a request naming nobody still writes with no check.
   `access-control-unattributed.int.test.ts`. *Check: integration.* Passes now and must keep passing.
7. **The deferred path is unchanged**, requester rebuilt from the row and the field rule applied when
   the job runs. `access-control-queue.int.test.ts`. *Check: integration.*
8. **A collection rule that reads `data` does not cost the editor their save.**
   `access-control-data-rule.int.test.ts`. *Check: `DB_ADAPTER=postgres` integration run.* Fails
   against the first draft of this change — that is how the hole was found — and passes now.
9. **Checks clean:** unit, check-types in the plugin and both apps, lint at the 58-warning baseline,
   integration green on all three adapters in both queue modes.

### Pre-flight, run against the untouched tree

| AC | polarity wanted | measured now |
|---|---|---|
| 1, 2, 3, 4, 6, 7 | must PASS now (behaviour must not change) | pass — 154/154 on PostgreSQL |
| 5 | must FAIL now (the code is still there) | fails — all six symbols present |
| 8 | must PASS now | pass — 1608 unit, lint 58 |

## Human choices

- **Payload owns field-level enforcement; the plugin owns only the collection-level pre-check.**
  Chosen over keeping a plugin-side walk, after measuring that Payload's own traversal handles every
  case the walk had been patched for.
- **`access-control-blocks.int.test.ts` is kept** even though the code it was written against is
  deleted. It now proves Payload's traversal rather than the plugin's, which is the claim this task
  rests on.

## Review log

- 2026-09-18 — contract written; gate approved (remove the walk, keep the collection-level check).
- 2026-09-18 — `/sp-red-test` in audit mode: three mutations on PostgreSQL. The behaviour the 19
  deleted checks held is now held by three integration checks, and mutation 2 proved the pre-check is
  load-bearing by killing the editor's save. One `it.each` label had outlived its mechanism and was
  corrected. Artifact: `artifacts/2026-09-18-suite-audit-after-the-reduction.txt`.
- 2026-09-18 — `/sp-complexity`: CHANGE 5 → 2, READ 5 → 3, and two enforcers that had to agree became
  one. The audit also surfaced the `data`-keyed rule hole, which reopened the design and produced D5.
  The half-identity proposal from the earlier run stands unchanged; this reduction did not touch it.
