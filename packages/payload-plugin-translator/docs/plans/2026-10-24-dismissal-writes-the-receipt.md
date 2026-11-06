# Dismissing the out-of-date mark writes the receipt

**Status:** designed, not scheduled · **Owner decision:** 2026-10-24, option 1 of two
**Do after:** the findings open against `Provenance.service.ts` (see *Not this task*)

## The defect

A receipt holds two fingerprints of the source:

| Field | Written by | Means |
|---|---|---|
| `sourceFingerprint` | `record` | the source this translation was made from |
| `dismissedFingerprint` | `dismiss` | the source as it stood when an editor hid the out-of-date mark |

Three readers ask "is this locale out of date", and only one of them consults both:

| Reader | Reads | Where |
|---|---|---|
| the admin panel's mark | both | `isRecordStale` — `core/domain/provenance/staleness.ts:38-43` |
| `changed_leaves` in the staleness response | `sourceFingerprint` only | `Provenance.service.ts:216` |
| the `stale` rule a run narrows by | `sourceFingerprint` only | `Provenance.criterion.ts:37-40` |

So after an editor hides the mark, the lamp goes out and nothing else changes: the response still
names the field in `changed_leaves`, and a run narrowing by `stale` still re-translates it over the
text the editor chose to keep.

`changed_leaves` was added on 2026-10-23 so the field picker can pre-tick what drifted, which is what
makes this reachable from the admin rather than only from the API.

### Why the suite is green over it

Both halves are covered; the pair is covered nowhere.

- Every `changed_leaves` and `is_stale` check runs on the `record()` fixture, whose
  `dismissedFingerprint` is `null` (`__tests__/Provenance.service.test.ts:55`). No dismissal exists
  in any of them.
- Every `dismiss` check stops at the write — "`store.dismiss` was called with this fingerprint"
  (`:264-283`), "no-op when the locale has no record". None reads back.
- No suite, unit or integration, dismisses and then asks for staleness.

## The decision

**Hiding the mark writes `sourceFingerprint`. `dismissedFingerprint` is deleted.**

The receipt then states one thing — *this translation is considered current against this source* —
and the three readers cannot disagree, because there is nothing left to forget to consult.

*Rejected: keep both fields and give the module one function that consults them.* It fixes the two
readers that are wrong today and leaves the trap set for the next reader, which is exactly how this
arrived. The second field earns nothing: outside `isRecordStale` nothing reads it, and nothing needs
to tell "translated from this source" apart from "a person accepted it against this source".

No schema change. The column may stay in place unread and be dropped in a later pass.

## Open — the owner's call, needed before implementation

**What does hiding the mark mean for a leaf that was never translated?**

A per-leaf receipt can claim `UNANSWERED` for a leaf — sent and never returned, or never sent with
no earlier claim. Writing the whole current map over it is a decision either way:

| | Consequence |
|---|---|
| include those leaves | the mark goes out, and a leaf nobody translated is claimed current — no later run picks it up |
| exclude those leaves | the leaf keeps its `UNANSWERED` claim, so `sameFields` keeps failing and the mark cannot be turned off while one exists |

The second needs somewhere else to report "never translated", separately from "out of date", or the
button appears broken. This is not a detail of the chosen option — the other option faces the same
question.

## What changes

| Piece | File |
|---|---|
| write the receipt instead of the dismissal | `src/server/modules/provenance/Provenance.service.ts` — `dismiss` |
| drop the second fingerprint from the comparison | `src/core/domain/provenance/staleness.ts` — `isRecordStale` |
| drop it from the port and the stored row | `src/core/domain/provenance/ProvenanceStore.interface.ts`, `src/server/modules/provenance/Provenance.store.ts` — `dismiss`, `toStoredData` |
| the field the collection declares | `src/server/modules/provenance/Provenance.collection.ts` |
| the receipt a fresh translation writes | `Provenance.service.ts` — `record`'s `dismissedFingerprint: null`, which retires the dismissal today and has nothing to retire after |

## Verification

Three checks, red before the change:

1. hide the mark, then ask for staleness — `is_stale` is `false` **and** `changed_leaves` is empty;
2. hide the mark, then run a translation narrowing by `stale` — the field is not sent;
3. hide the mark, move the source again — both say out of date once more.

A fourth follows from the open question above and is written once it is answered.

Then the usual: `bunx vitest run`, `bun run check-types`, `bunx oxlint .` from the package,
`bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root, and
`bun run test:integration` from `apps/dev` after a rebuild.

## Not this task

Open against `Provenance.service.ts` from the three audits of 2026-10-24, to be settled first:

- one failure policy for the class instead of four — `dismiss` uses no `swallowOrThrow` and logs
  nothing, so a store failure leaves it raw;
- one answer to "which leaves moved" for both `getStaleness` and the `stale` rule, instead of two
  implementations;
- the service mints the HTTP response shape, which the client re-declares by hand.

The second of those is where this task lands once it is done: with one answer, the baseline is
chosen in one place.
