# What the 1.0 admin needs from the server

**Status:** settled in design, not built · **Risk:** medium · **Ships with:** the major

The 1.0 admin was designed from the editor's task rather than from the current screens. This records
only the **server-side** half of what that design assumes, so it is not re-argued with whoever picks
it up. The screens themselves are designed separately.

## What this does *not* cover, because it is already settled on this branch

Read these first; everything below docks onto them and none of it contradicts them.

| Already decided | Where |
|---|---|
| a run carries a list of **filters**, not a strategy — `{ kind: "leaves", addresses }` or `{ kind: "rule", name }`, intersected, empty list meaning every translatable leaf | `2026-10-23-fields-not-a-strategy.task.md`, `2026-10-23-one-list-of-filters.task.md` |
| the per-locale stored shape `targets: [{ lng, filters }]` | same, the shape check |
| criteria are applied by the handler; provenance **reports** and never narrows (D5) | `fields-not-a-strategy`, D5 |
| the chain stays assembled at boot; no per-locale assembly (D6) | same, D6 |
| a `stale` answer on `Provenance.service`, whose named second caller is *"the staleness route, which needs the same per-leaf answer to report drifted addresses"* | same, New surface |
| one leaf per `richText` field — rich text cannot be selected below the field | same, Open |

The field picker's output is a `{ kind: "leaves", addresses }` filter. Nothing new is needed to carry
a person's ticks to a run.

**Nothing below changes what is stored.** Every value is derived at read time from the receipt the
plugin already writes.

## 1. The staleness answer must carry the reason, not only the set

`fields-not-a-strategy` already justifies the per-leaf `stale` answer by the staleness route needing
it. The delta is its shape: the run wants a **set of addresses**, the admin wants a **reason per
leaf**, and they should be one computation.

```ts
type LeafVerdict = "current" | "drifted" | "unanswered" | "unrecorded";
```

| Stored in the receipt | Source now | Verdict |
|---|---|---|
| hash A | hash A | `current` |
| hash A | hash B | `drifted` |
| `!unanswered` | anything | `unanswered` |
| address absent | a hash | `unrecorded` |

The run collapses anything that is not `current` into "translate"; the admin reads the reason. Two
functions over the same receipt would put one rule in two places — and the rule changed once already
today ("an address the receipt does not name means translate"), which would then have had to be
changed twice.

**Why the reason matters to a person.** `unanswered` means a leaf was sent and came back incomplete:
source text is sitting in the target, mixed with translation. Today nothing says so, and the only way
to find out is to read the translated page. `drifted` is ordinary life; `unanswered` is a failure.
The admin marks them differently.

**It is already computed and thrown away.** `getStaleness` reads the document's records, hashes the
source once and reuses it across locales, then calls `isRecordStale`, whose `sameFields` walks every
leaf and collapses the walk to one boolean. Returning the walk costs nothing new.

## 2. A route for the picker's tree

Explicitly left to the client half by `fields-not-a-strategy`, but the tree itself is server data: it
describes the **saved document**, not the schema, because leaf addresses are id-based and a person
needs "this block, not that one".

```ts
type DocumentTranslationState = {
  /** The document's translatable shape — one tree, shared by every locale. */
  tree: readonly TreeNode[];
  /** Fields excluded from translation; labels only. */
  excluded: readonly string[];
  locales: readonly LocaleState[];
};

type TreeNode =
  | { kind: "group"; label: string; children: readonly TreeNode[] }
  | { kind: "leaf"; label: string; address: string; required: boolean };

type LocaleState = {
  locale: string;
  content: ContentState;
  /** A run in flight. Orthogonal to content: a first translation can be in flight too. */
  run: RunState | null;
  /** Addresses without which Payload refuses the write. See §3. */
  mustInclude: readonly string[];
};

type ContentState =
  | { kind: "empty" }
  | { kind: "untracked" }
  | { kind: "tracked"; verdicts: Readonly<Record<string, LeafVerdict>>;
      translatedAt: string; dismissed: boolean };
```

Three things the shape is deliberate about:

**`untracked` must not be folded into `empty`.** A locale with content and no receipt is one someone
translated by hand. Treat it as "never translated" and the admin offers "first translation, all of
it" and wipes their work — the failure removed from `skip_existing` earlier on this branch, walking
back in through the admin. Named in the type, it cannot be forgotten.

**`group` and `leaf` are a union, not an optional `address`.** An optional field never says when it
is absent; a union forces both cases, and a third kind of node becomes a compile error rather than a
silent fall-through.

**The run is its own field.** A locale can be translated and running again, or empty and running for
the first time. Two independent facts.

Labels: a field has one; a **block instance** does not, and "Block 3" is useless where "Call to
action — «Buy»" is not. Payload solves this in its own admin with `RowLabel`. Real work, better
recognised here than discovered in implementation.

Knowing a locale is empty is free: read it with `fallbackLocale: false` — the read `handler.ts:88`
already makes — and a locale with no value on any translatable leaf is empty. What must **not** be
used is the presence of a receipt, for the reason above.

## 3. `mustInclude` — required fields that are empty in the target

A partial run whose write leaves a required localized field empty is refused by Payload. This is not
a property of a first translation: add a required field to a collection and every existing locale is
now missing it, so the same refusal awaits a partial run there.

So the admin locks those checkboxes, and the server supplies the list — it can see the target's
values and the client cannot.

**Two locks with different lifetimes, and conflating them is the trap:**

| Lock | Applies to | Lifetime |
|---|---|---|
| required and empty in the target | those leaves, on any write of that locale | **permanent** — a property of Payload |
| everything else, on a first translation | that run | until a deliberately excluded leaf is recorded as `UNANSWERED` |

Written as one rule — "first translation locks everything" — the permanent half disappears with the
temporary one, and the failure surfaces later, for whoever adds a required field to an existing
collection.

*Note against D1.* `fields-not-a-strategy` D1 says nothing consults the target locale to decide what
to **translate**. `mustInclude` does not: it is about what the **write** needs to be accepted. The two
do not conflict, but the distinction is worth keeping in words, because both are "a list of addresses
derived from the target".

## 4. Abilities reach the browser through the provider, not a route

A control whose ability is absent is **not rendered** — not disabled, not greyed (D20). Abilities are
computed at boot from the routes that actually registered, so they cannot drift from reality.

They need no endpoint. The channel exists and carries exactly one field today: `CacheProviderExport`
has `serverProps: { basePath }`, Payload renders it server-side, `TranslateKitConfigProvider` puts it
in context, `useTranslateKitConfig()` reads it. An endpoint would be a round trip for a constant —
abilities cannot change without a redeploy.

```ts
type TranslateKitConfig = {
  basePath: string;
  abilities: Abilities;
  /** Facts that depend on the collection rather than the installation, by slug. */
  collections: Readonly<Record<string, CollectionFacts>>;
};

type Abilities = {
  translate: boolean;      // start a run and watch it
  cancel: boolean;         // stop one in flight
  runNow: boolean;         // execute a queued job now
  staleness: boolean;      // see drift, and dismiss the notice
  translateField: boolean; // translate one field in place, with no run
};

type CollectionFacts = {
  /** Locales this collection is translated into on save. Empty means auto-translate is off. */
  autoTranslateTargets: readonly string[];
};
```

**Flat, never keyed by module.** One locale row in the admin needs three modules at once, so keying
by module would make every component learn module names — the mistake D20 rejected one level down: an
ability must not name its implementor, or the implementor cannot be replaced. A host module's own
abilities are a separate, later problem (step 9) and arrive additively as a clearly-marked bag the
plugin's own components never read.

Smaller choices: `translate` covers reading status, because both come from one registration and two
fields that cannot disagree are one field; `cancel` and `runNow` stay apart because step 6 (#200)
declares them separately and the sync runner answers `not_found` to run-now; every flag is always
present, since sending only the true ones reintroduces "false" versus "unknown"; auto-translate is a
list of locales rather than a flag, because a flag and a list can disagree and an empty list cannot.

**Open:** ability and permission both mean absent (D20), but whether that server component can
evaluate the access guard per user is unverified. If it cannot, some controls appear only after a
request, and "the panel's shape is known before first paint" stops being true.

## 5. Translation state for a page of documents

The collection list gains a translation-status column — a virtual field with a custom `Cell`,
injected only when the host lists the component. The route behind it does not exist:
`getCollectionStatus` returns **runs** in flight and recent failures (`{id, status, collection_id,
target_lng}`), which are queue jobs, not translation state.

**It takes a list of ids, not one.** A cell knows only its own row, so twenty-five cells would make
twenty-five requests. They must share one react-query key — collection plus the list's current query
— and each find itself in the shared answer.

**Keep it cheap: no staleness in the list.** Per locale translated and when is one query over the
sidecar collection. *Whether it drifted* needs the source of every document on the page read and
hashed — twenty-five reads and twenty-five hashings per page turn. The column says "translated into
de, es · 3 days ago" or "not translated", which is already more than Payload's list can show.

**Two consequences to accept rather than discover:**

- **The column cannot be filtered on.** A virtual field has nothing in the database, so
  `admin.disableListFilter: true` — an absent filter beats one that silently finds nothing. "Show me
  the untranslated ones" is the first thing a person will ask on seeing the column, and 1.0 cannot
  answer it. Putting the state on the document to make it filterable would be a second source of
  truth for something derived.
- **The field reaches the API and the host's generated types**, always empty, because it only renders
  in a cell. Payload has no "add a column without a field" slot.

## 6. Editing a target field clears that leaf's drift

A new `afterChange` hook on managed collections, firing when the write is **not** in the source
locale: compare `doc` with `previousDoc` per localized leaf (`computeFieldFingerprints` already does
the hashing) and record the source's current hash for every leaf that changed.

**Why.** The receipt says "this German was made from this English". A person editing a German field
asserts exactly that, whatever they used to produce the text. The staleness marker exists to say "the
English moved, look at this" — they looked and acted.

**It closes, from the right side, the hole this branch opened.** Protection for hand-written copy was
removed because the plugin cannot guess authorship. It returns here without guessing: the plugin does
not ask who wrote the text, it observes that the field was **edited**. A fact, not an inference.

**Verified safe on the axis that could have made it silent corruption:** the admin's document view
reads with `fallbackLocale: false` in all four places it fetches, so an untranslated field is
genuinely empty in the form and a save never writes source text into a target locale by itself.

Four things not to forget:

1. **A typo fix clears real drift.** Someone corrects a comma in German while the English was
   rewritten; the leaf goes current and the plugin never returns. Accepted — the field was in front
   of them — but accepted deliberately.
2. **Bulk edit has the same meaning and a wider radius.** `EditMany` writes one field across many
   documents in the active locale.
3. **The hook must skip the plugin's own writes**, which already carry
   `translatorSkipAutoTranslate` — otherwise it races the receipt a run has just written.
4. **Which source to hash against**: the locale the leaf's record names, or the configured default
   when there is no record.

*Against D5.* `fields-not-a-strategy` D5 says provenance reports and does not narrow. This hook does
not narrow either — it **records**, which has always been provenance's other job. But it does give
the module a second write path, and that is worth naming rather than discovering.

*A more honest variant, for later.* "Current" claims the German was *made from* this English, which
for a hand edit is a statement about intent, not mechanism. Stored instead as a per-leaf
**acknowledgement**, the admin could say "you edited this yourself" and the knowledge that the source
did move would survive. It costs a second per-leaf map and one more state on screen.

## 7. The dismissal has to be reconciled with per-leaf answers

`isRecordStale` consults `dismissedFingerprint`, so a dismissed locale reads as current even when its
leaves have moved. While the answer was one bit this was invisible. With per-leaf verdicts the admin
would say "this locale is fine" beside "3 fields have drifted" — the plugin arguing with itself.

The shape in §2 keeps the verdicts truthful and carries `dismissed` as a separate fact, so the admin
says "3 fields have drifted; you asked not to be reminded". Hiding the drift instead would make the
dismissal a lie about the document rather than a note about the reminder.

## 8. `ComponentContext` needs `addConfigModifier`

A list column is a browser thing that requires a config change: the virtual field must be injected
into the collection. Today `ComponentContext` cannot modify config — only `ModuleContext` can.

Either it gains the method, or a column is declared a module, which it is not. **Preferred: give it
the method**, and D7's boundary reads "a module contributes routes and collections; a component
contributes what is seen in the admin, together with the config needed to place it there".

## Open

- Whether `staleness` is one ability or two. Seeing drift and dismissing the notice are different
  rights that happen to share a source today; one field for now, recorded as a known seam.
- Permission versus ability, per §4.
- Whether `mustInclude` is computed server-side (preferred — it needs the target's values) or the
  client reads the target document itself and derives it.
