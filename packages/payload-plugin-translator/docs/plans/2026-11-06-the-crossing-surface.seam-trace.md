## Seam trace — the crossing surface of the traversal languages

Source: docs/plans/2026-11-06-the-crossing-surface.design.md
Saved: docs/plans/2026-11-06-the-crossing-surface.seam-trace.md
Model: 7 parts · 8 seams (3 global) · 5 shared values
Confirmed by: the owner, before any scenario ran
Lenses: runtime (a config-build→walk boundary and a derived value), structure + evolution
(growth) · stack packs: headless-cms
Runs: runtime + growth
Scenarios: 6 traced · kinds skipped: `interleave` — the working copy is single-writer inside one
walk in one process with no retry, so the ground condition fails; `actor` — no identity, token or
draft state crosses any seam here
Growth axes: 4 traced · 0 cut by the cap
Breaker: 11 runtime breaks + 1 cross-seam + growth returned · 8 admitted · 4 dropped with citations

### Your worry

> a host that runs a crossing entry to learn which language it is has already let that entry seat a
> clone of the source over the target's value. Does the decided entry shape close it, and can any
> other step write before the host has consented?

**Half closed, and the open half is worse than the one that was closed.**

Closed (scenario T2, steps 1–2): when a field names `formats`, the host filters the crossing list by
`languageId` without calling `open`, so a non-matching entry is never run and nothing is seated. The
path the entry shape was designed for does not occur.

Open (scenario T1, step 4): `setValue` is handed to every entry in the offer, unconditionally, and
nothing in the convention says when an entry may call it. An entry that assigns before it decides,
then returns `null`, has already replaced the target's value — and the host's own assumption is that
an entry returning `null` wrote nothing. See finding 1.

And a second writer nobody traced: finding 3 — the convention's replacement type drops an aliasing
promise the current one makes, and under the plain reading of the new type a format can report a
translation that reaches nothing.

### Findings

#### 1. unstated — an entry can replace the target's value and then decline, and the only report points elsewhere

Seam: host language → format language (S4) · Scenario: T1, step 4
At that step: `markdownEntry.open({ value: source.body, setValue, embed })` assigns
`working.body := clone(source.body)` = `root[ paragraph["Buy now"], cta{heading:"Subscribe"} ]`,
then returns `null`. No later entry recognises the value.
Relies on: S4's consumer assumption, "an entry that returns `null` has written nothing" — which the
provider's side never states. Its own words are only *that* `setValue` seats a copy and *why*, never
*when* it may be called.
Consequence: stored, the German locale's `body` holds the English source text; the previous
translation `"Jetzt kaufen"` / `"Abonnieren"` is gone. The run reports `selected but no text` for
`body` — a message about missing text, for a field whose text was overwritten. No error, no failed
locale.
Decision needed: should `open` receive the means to write at all, or should it return the working
copy it wants seated and leave the seating to the host, after consent? — `/sp-architect`, reopens D2
and D3.

#### 2. mismatch — the embed name is documented as the format's word and carries the host's slug; a second format that believes the documentation loses every embed

Seam: format language → host language (S5) · Scenario: breaker R1, steps 5–7
At that step: a Slate format sends `{ name: "payload-block", flow: "block", data: {...} }` — its own
node type, exactly as the convention describes — and the host looks it up in
`Map{ "cta" -> [heading] }`, keyed by the Payload block slug. Miss.
Guarantee: "`name` is the format's own word" · Assumption: "the host interprets `name` against its
own lists". Both are kept, and they do not meet. The shipped language works only because its
`embedOf` sends `fields.blockType` — the *host's* slug — not its own node type, which is the one
thing the convention says it is sending.
Consequence: every embedded block in that format is skipped silently, and because the crossing has
already seated a clone of the source, their previously translated content is replaced by English.
The run reports success with a smaller unit count that nobody has a baseline for.
Decision needed: does `name` carry the format's word with a host-side mapping step, or the host's own
key with the format obliged to find it? — `/sp-architect`, reopens D3.

#### 3. unstated — the replacement convention drops the aliasing promise the current one makes

Seam: format language → host language (S5) · Scenario: breaker R2, steps 2–5
At that step: the format builds `data: { ...node.fields }` — a copy, which
`Record<string, unknown>` fully permits. The host crosses back into it, the engine writes
`"Abonnieren"` into the copy, and the seated node still holds `"Subscribe"`.
Relies on: the aliasing that today's `richTextCrossing.ts:26` states in prose — "the node's own
fields object, **aliased**: the walk writes translations into it" — and that the design's
`EmbedIdentity` does not carry forward.
Consequence: stored, the German `body` keeps `heading: "Subscribe"`. The run reports two units
translated and a successful locale; the provider is billed for both. The disagreement is visible
only by opening the document.
Decision needed: the new type must carry the promise, and say whether it is the only way a format may
pass embedded data — `/sp-architect`, reopens D3. Low cost, high consequence if missed.

#### 4. unstated — "seats a copy" does not say *deep*, and a shallow copy writes the source document

Seam: host language → format language (S4) · Scenario: breaker R6, steps 1–5
At that step: an entry that seats `{ ...value }` shares `root.children` with the source. The format
then mutates text nodes in place, so `source.body` becomes
`root[ paragraph["Jetzt kaufen"], cta{heading:"Abonnieren"} ]` while the run is still going.
Relies on: Table 3's "source document · writers: nobody during a walk", which S4's wording does not
protect. The shipped entry uses a deep clone; the convention does not require one.
Consequence: a second target locale in the same run translates the German, not the English — a pivot
nobody chose. Both locales report success. Depends on an unverified cell: whether per-locale walks of
one run share one in-memory source document.
Decision needed: state the depth in the convention, and state that a format may not alias the source
— `/sp-architect`, reopens D3. Then verify the shared-source cell by reading the run.

#### 5. guard-gap — an empty `formats` list boots clean and silently disables the field

Seam: config build → author config (S7) · Scenario: breaker R4, steps 1–5
At that step: `{ formats: [], embeds: { blocks: ["cta"] } }`. The refusal pass rejects "a `formats`
entry naming no registered crossing"; an empty list has no entries, so there is nothing to reject.
The host then filters the crossing list to nothing and no entry is called.
Consequence: on a locale translated before, the field keeps its old content and the run reports
`selected but no text`; on a new locale, the field is simply never translated and the same message is
the only signal. The author's assumption — "a config that boots is a config whose declarations are
all live" — is false while the guard works exactly as specified.
Decision needed: is an empty `formats` list a legal way to say "no format may take this field", or a
boot error? If legal, it needs a different spelling from the one that means "I narrowed to nothing by
accident" — `/sp-architect`, reopens D6.

#### 6. mismatch — two spellings of one meaning, against the invariant the type was shaped to hold

Seam: author config → projection (S1), projection → host (S2) · Scenario: breaker R10 and T4
At that step: `FieldEmbeds`' object variants admit `{ blocks: [] }`, because `Def[]` may be empty.
With the plugin's default `inlineBlocks: []` — the starting state's own value — an inherited list and
an explicitly empty one are the same thing for every field in the project at once.
Guarantee: D6's "no state has two spellings and no spelling has two meanings"; the `{}` guard covers
only the all-absent case, and `FieldCrossingDeclaration = { formats?; embeds? }` is itself inhabited
by `{}`.
Consequence: an author who writes `{ blocks: [] }` and an author who writes `"none"` get the same
behaviour by different routes, and a project whose default list is empty cannot tell inheritance from
refusal in either direction. No report distinguishes them.
Decision needed: forbid an empty list in the union, or drop `"none"` and let an empty list be the
spelling — one of the two, not both — and say what an empty default means — `/sp-architect`,
reopens D6.

#### 7. half-done — declaring "do not translate embeds here" replaces those embeds with English

Seam: host → working document (S8) · Scenario: breaker R3, steps 2–6; same root as T3 and breaker R7
At that step: with `embeds: "none"`, the entry still seats `clone(source.body)` over the German tree,
then the host refuses the embed. The refusal arrives after the slot was already replaced.
Consequence: stored, the cta block reads `heading: "Subscribe"` where the editor had
`"Abonnieren"`. The author's declaration is executed as its opposite. The same mechanism silently
reverts anything inside an embedded block that produces no unit — breaker R7's non-localized
`trackingId` goes from `"de-campaign"` back to `"en-campaign"` with no unit, no report line and no
visible absence to prompt a check — and restores a block the editor deleted by hand (T3, step 7).
Decision needed: this is the source-tree-versus-target-tree question already scoped to its own body
of work, and this trace raises its priority: the per-field declaration makes the damage *reachable by
configuration*, not only by re-running. — the user: does part (b) still wait, or move ahead of this?

#### 8. owner-missing — no seam carries a write receipt, so every finding above is reported as success

Seam: across S4, S5, S8 · Scenario: breaker's cross-seam pass, with findings 1–4 as instances
At that step: `setValue` returns nothing; `EmbedResolver` returns a crossing or `null`; `Crossing`
carries no confirmation. Table 3 gives the working copy exactly one reader, the save step, and
nothing re-reads it against what the engine believes it wrote.
Consequence: in every one of findings 1, 2, 3 and 4 the run reports a successful locale and a unit
count, the provider is billed, and the document disagrees. The only thing that reveals it is a person
opening the translated document.
Decision needed: should the walk be able to report that a unit it translated did not reach the
document — and if so, at which seam — or is that the partial-translation work already deferred?
— the user, then `/sp-architect` if yes.

#### 9. growth — appending a crossing entry is not one line, because order is semantic and nothing declares what an entry recognises

Axis: a second rich-text format · rows: Axis A, row 1, traced `flat`
Counts: the traced table says 1 part edited and 0 seam contracts changed for both the 2nd and the 3rd
addition. In fact the 2nd addition must be positioned against 1 existing entry and the 3rd against 2,
and each existing entry must be re-checked against the new format's values — because recognition is
observable only by calling `open`, which finding 1 shows may write first. A recogniser as loose as
"an object with a `children` array" claims Lexical, Slate and TipTap alike. Existing instances
touched: 1 → 2. Class: **entangled**, not plug-in.
Consequence: every new format addition costs a review of every previous one, and a mistake is finding
1's data loss rather than a type error.
Decision needed: should an entry declare what it recognises separately from opening it, so the host
can choose without running anything? — `/sp-architect`, reopens D2 and D3. This is the same question
finding 1 asks, from the growth side.

#### 10. growth — a third embed list edits three parts the traced table omits, and the declaration union grows as 2^n − 1

Axis: a third embed list · rows: Axis B, traced 5 rows
Counts: the traced table omits the refusal pass (a slug check per list), the plugin option (a third
default list) and the shared-state row for the default lists — 8 rows, not 5. The declaration union
needs 2 object variants for 2 lists, 7 for 3 and 15 for 4, because it is shaped to forbid the
all-absent case. Parts edited 2nd → 3rd: 5 → 8. Seam contracts changed: 2 (S1 and S5). Class:
**entangled**.
Consequence: the device that buys finding 6's invariant is the device that makes a third list
expensive, and finding 6 shows the invariant is not actually held.
Decision needed: is the all-absent case worth a union that grows exponentially, or is it better
expressed another way? — `/sp-architect`, reopens D6.

#### 11. growth — the embed convention is not host-neutral, which is the axis it exists to serve

Axis: a second host · rows: Axis C, row 1, traced as "conventions: —"
Counts: finding 2 is this leak firing inside a single host already. `name` is interpreted against the
host's lists and `data` is read at the host's own field names (T3, step 6), so the convention carries
one host's block-data layout implicitly. Parts edited for host 2: 5, not 2; for host 3 the same rows
again, multiplied by the number of formats in play. Class: **invasive**, and the cost is
formats × hosts.
Consequence: the second host that the convention was unified for cannot adopt it without every
existing format gaining a mapping step.
Decision needed: the same one as finding 2 — whose vocabulary `name` is in — answered once, closes
both. `/sp-architect`, reopens D3.

### Growth

| Axis | Next addition | Parts edited (2nd → 3rd) | Seam contracts changed | Central points | Class | Why |
|---|---|---|---|---|---|---|
| a second rich-text format | Slate, then TipTap | 1 → 1 traced; **2 → 3 in fact** | 0 | the crossing list, whose **order is semantic** | **entangled** | finding 9 |
| a third embed list | a "table cell" flow | 5 → 8 | 2 (S1, S5) | the flow vocabulary, the declaration union, both default lists | **entangled** | finding 10 |
| a second host | a non-Payload host | 2 traced; **5 in fact** | 1 (S5) | the embed convention | **invasive** | finding 11 |
| a foreign format in a non-rich-text field | a `code` field, then a `json` field | 1 → 1 | 0 | the crossing list | **plug-in** | the field-type test was removed; the host does not change |

The last row is the design's clearest win and it survived the breaker: a foreign format on a field
type the package does not translate costs one entry and one declaration, and no part changes.

### Smells off the model

- **Central switch** — threshold: the same list of kinds kept in 2+ parts or on both sides of a seam.
  Count: the set of embed lists is kept in the flow vocabulary (conventions), the declaration union
  (author config), the projection, the host's list selection and the plugin's default lists — **5
  places, 2 of them on opposite sides of S1**. Explains growth class `entangled` on the third-embed-
  list axis (finding 10). The decision it raises: who owns the set of embed kinds.
- Every other smell is under threshold. Threaded shape: no 3 fields cross 3 seams unchanged. Chatty
  seam: the most any scenario crosses one seam is 2. Pass-through part: none. Cycle: none in
  production edges. Orphan value: none — Table 3 gives every value one owner.

### Dropped breaks, with the citation that stops each

- **R5 — two entries sharing a language id cause a double seat.** Dropped: the host returns on the
  first entry that answers, `PayloadFields.language.ts:219`, `if (opened !== null) return opened;`,
  and trace T2 step 3 ends there. *Residual kept as a note:* nothing forbids two entries sharing an
  id and the refusal pass does not check uniqueness, so which of the two runs depends on list order,
  invisibly. Small, and it is the same ordering question as finding 9.
- **R9 — a typo'd format on a `code` field sends the whole document as one unit.** Dropped: a `code`
  field is never selected — `translatableLeaf.ts:17`, `isTranslatableFieldType` admits only `text`,
  `textarea` and `richText` — so no unit is produced. *Residual kept as a note:* on such a field the
  fallback is silence with no report at all, not even "selected but no text".
- **R11, first half — nine rich-text fields exhaust the crossing budget.** Dropped: the cap counts
  per path, `walk.ts:107` passes `crossings + 1` down a branch rather than incrementing a shared
  counter. *Residual kept as a note:* the second half stands — a depth that exceeds the cap throws,
  and the model does not say whether that produces a report line.
- **R8 — a field added to the schema after the snapshot.** Dropped as not caused by this design: the
  snapshot's boundary predates it and `FieldLike.content` only rides the lifecycle the snapshot
  already has. *Residual kept as a note:* a declaration on a late-added field is dead, and the
  refusal pass passes it vacuously, so S7's promise to the author is narrower than its wording.

### Open questions

- **O-B carried from the design** — the plugin option holding the crossing list is unbuilt, so the
  refusal pass has no registered id set. Scenario T5 is what that costs: a typo'd format id goes
  through boot and costs the whole field, reported only as "selected but no text". The slug half of
  the pass can run without it.
- **The shared source document across locales** (finding 4) — whether the per-locale walks of one run
  hold one in-memory source object. A read of the run, not a guess.
- **Whether a crossing that exceeds the depth cap produces a report line** (R11 residual).
- **Two unlisted growth axes the parts make likely**, neither traced: preserving the target document
  instead of replacing it — the widest edit in the model, touching the convention, S4, S5, S8, the
  host, every format and the engine, and the axis findings 7 and 3 both point at; and a second
  declaration carrier, which the design already half-anticipates by guarding the carrier decision,
  and which fields owned by other plugins would need because they cannot carry `custom`.

### Not knowable from the model

- Whether a real provider's answer ever omits a unit, which decides how often finding 8's silent
  divergence is reachable without a code defect.
- The real boot cost of the resolution pass on a large schema; the design states it as a count, not a
  measurement.
- Whether Payload mutates `custom` during sanitize. The package already depends on it not doing so,
  and this design adds a second reason.

### Next

Findings 1, 2, 3, 4, 6, 9, 10 and 11 need design decisions and name the ids they reopen: **D2, D3,
D6**. Finding 7 and finding 8 are the user's: whether the target-tree question and the
partial-translation question move ahead of this work, now that a configuration can reach the damage.
Nothing here blocks build steps 1 and 2 of the design, which touch neither the entry shape nor the
declaration.
