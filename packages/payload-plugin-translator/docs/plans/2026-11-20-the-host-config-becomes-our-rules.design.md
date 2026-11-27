# Architecture Design — the host's config becomes our rules

**Date:** 2026-11-20 · **Status:** designed (forward architecture, two candidates + adjudication);
implementation pending approval. · **Branch:** `feat/translator-admin-ui-on-stubs`.

**Method:** landing site mapped directly (quick mode, no cartographer) → two candidate designs on the
two most divergent priorities of the leading vector (thin-contract · anti-corruption-layer) →
adjudication against the invariants of every loaded vector, with a shapes check for a form neither
candidate proposed.

Build step: 2026-11-19-fewer-worlds-louder-refusals.design.md #1 — this revises that step and the
`worldOfCollection` half of its step 5. That design's steps 2, 3, 4, 6 and 7 are untouched.

### The ask (ground truth)

One entry where the host's Payload configuration becomes the plugin's own rules. Readers ask those
rules; nobody else reads Payload's `versions` config or writes Payload read arguments by hand.

- R1 (in) No reader outside the entry writes version read arguments by hand or reads the host's `versions` config.
- R2 (in) ~~The rules are listed in one place a reader can enumerate, not scattered across `if`s.~~ **Dropped 2026-11-20** — see *Retracted after the build*.
- R3 (in) An illegal pair — a world with no published layer, asked for the published version — is unbuildable, not checked at runtime.
- R4 (in) The answer adds no more machinery than it removes; the owner named files and forks together and made this the selection criterion.
- R5 (out) draft translation · any change to stored shapes · removing the admin stub · migrating existing installs.

**Vectors:** structure + contract (leading: contract) — the host's configuration is a foreign model
that changes without us, and the whole ask is CT3's closing clause: translate it at the edge into
this system's own vocabulary. `data-model` was considered and dropped: no entity, no stored shape.
Stack pack: headless-cms, whose HC2 binds as an invariant here because contract is loaded.

### What this starts from (measured)

Four places write version read arguments by hand: `sourceDocument.ts:7` and
`localesHoldingContent.ts:8` (identical constants, independently declared),
`targetDocument.ts:136,139` (the same arguments spelled across two lines of one call), and
`translation-stub/__tests__/translationStub.test.ts:215`, which **asserts** them and is therefore the
behaviour baseline rather than a violation.

Four places read Payload's version config: `targetLayer.ts:2,45,49`, `run.ts:39`,
`AutoTranslateEnqueue.hook.ts:2,70`, `composition/modules/documentTranslation.ts:1,25`.

**Why a guard over the literal was ruled out.** The earlier build step proposed an analyzer zone. It
cannot be written: the installed analyzer has no rule that inspects a literal. The fallback, a scan
of source text, is defeated by the tree as it stands — `targetDocument.ts` spells the same arguments
across two lines, so a scan would report clean while a third of the sites went untouched. The owner
rejected scanning as policing a symptom and set the instruction this design follows: remove the
reason anyone writes the arguments.

**The live defect this uncovers.** `keepsDrafts` is built at config time from `ctx.collections`
(`documentTranslation.ts:23-27`), declared at `createTranslationRoutes.ts:24` and
`enqueue-translation/model.ts:41`, and consumed at request time (`handler.ts:56`) — while `run.ts:39`
reads the registered config. Two owners of one fact, and a sibling plugin in this repository moves a
collection between worlds after the translator has read it
(`payload-plugin-scheduling/src/utils/injectSchedulePublishToVersions.ts:9-20`). So the two owners can
disagree today.

### Decision points

- D1 [load-bearing] Where the split between the host's vocabulary and ours falls (axis: placement · trust-boundary · reversible)
- D2 [load-bearing] What shape makes a rule a rule rather than a named boolean (axis: abstractions · reversible)
- D3 [load-bearing] When the world is derived, and what happens to the carriers (axis: dataflow-state · reversible)
- D4 [load-bearing] How the illegal pair becomes unbuildable, and whether anything mechanical holds R1 (axis: abstractions · trust-boundary · reversible)

No decision is irreversible: nothing stored changes, nothing is published from the package entry, and
every step reverts by reverting its commit.

### How it lands on the system

**Reuse.** The union that makes an illegal world unbuildable already exists twice —
`targetLayer.ts:25-34`, where `publish` lives only on the drafts variant because
`publishSpecificLocale` without drafts silently drops every other locale, and `targetDocument.ts:44,50`,
where `fallbackLocale: string` is paired with `fallbackLocale?: never`. The device that makes a value
unforgeable also exists, in one of the offending files: `targetDocument.ts:25-39` mints a type with a
module-private symbol, so no literal can name it. ~~The `provedBy` table and its meta-test come from the
sanctioned design unchanged.~~ **Removed 2026-11-20** — see *Retracted after the build*.

**Touched.** `src/core/domain/world/` (new) · `src/server/shared/payload/` (`worldOfCollection.ts` new;
`sourceDocument.ts`, `localesHoldingContent.ts` moved) · `src/server/features/translate-document/`
(`targetLayer.ts` re-signatured, `targetDocument.ts`, `run.ts`) · `src/server/features/enqueue-translation/`
· `src/server/modules/auto-translate/` · `src/composition/modules/documentTranslation.ts` · `oxlint.config.ts`.

**Not touched.** `src/types/wire/*` · the provenance table · the run row · `visibleIds` and
`getAllCollectionIds`, whose move stays gated on the sanctioned design's step 2 pin.

### The design

**Abstractions.**

- `WorldKind = "layered" | "single-layer"`, `HostWorld`, `resolveWorld(switches) → Supported | Refusal` —
  payload-free, on plain booleans, in `src/core/domain/world/`. Callers that exist today: the
  auto-translate hook at `AutoTranslateEnqueue.hook.ts:70`, and the config-time refusal the sanctioned
  design names.
- ~~`SUPPORTED_WORLDS` — two rows, each naming a `provedBy` test path, with the meta-test. Unchanged
  from the sanctioned design, and it states in a line that `autosave` and `provenance` are not axes.~~
  **Removed 2026-11-20** — see *Retracted after the build*.
- ~~`RuleSubject` + `WORLD_RULES` — **one** mapped table over `RuleSubject` × `WorldKind`, beside
  `SUPPORTED_WORLDS` and keyed by the same union so membership cannot drift.~~ **Never built**; see
  *Retracted after the build*. Subjects:
  `readsTheLatestAs`, `readsThePublishedAs` (layered only), `translationIsWrittenAs`,
  `translationIsPublished` (layered only), `autoTranslateFiresOn`. Every answer is a closed union of
  **plugin tokens** — never a Payload argument.
- `worldOfCollection(collection)` — `src/server/shared/payload/worldOfCollection.ts`. The only file
  that imports `hasDraftsEnabled`/`hasAutosaveEnabled`, the only place tokens become Payload
  arguments, and the only minter of `VersionRead`.
- `VersionRead` — a read-argument type branded with a symbol the adapter never exports, so no literal
  can name it. The house device from `targetDocument.ts:25-39`.
- `layerOf(world, targetLng) → TargetLayer` — stays in `targetLayer.ts`, keeps `TargetLayer`,
  `WriteLayer` and `PublishScope` and its contract test, and stops importing `payload/shared`.

**Dependency direction.** `composition` → `server/features` → `server/shared/payload` →
`core/domain/world` → nothing. No new edge, no cycle. The core gains no Payload vocabulary, by import
or by literal.

**Data flow & ownership.** The **registered** collection config is the single source of truth for
which world a collection is in, read per call, never cached, nothing stamped on `custom`.
`keepsDrafts` — today a second, config-time owner a sibling plugin can falsify — is removed. The rules
table derives from nothing; it is a declaration.

**The entry owns the version half only.** `localesHoldingContent.ts:14` spreads `{ overrideAccess: true }`
beside the version constant while `sourceDocument.ts:38` spreads `enforcedAtTheRead(user)` there
instead. An entry returning both halves in one object would hand `overrideAccess: true` to a caller
that asked for a version. The access half never travels with the read.

### Requirement coverage

| R | Design element |
|---|---|
| R1 | `worldOfCollection.ts` as the only importer of the version predicates (lint zone) and the only minter of `VersionRead` (branded type); all four hand-writing sites and all four config readers move onto it; `keepsDrafts` deleted |
| R2 | **dropped 2026-11-20.** The mapped table was never built; the two-row supported-world table that stood in for it is removed. The list of worlds is the `World` union, maintained by the compiler. See *Retracted after the build* |
| R3 | `readsThePublishedAs`, `translationIsPublished` and `layerOf`'s `publish` exist only on the layered variant — absence of a key, not a runtime check |
| R4 | forks 13 → 1; carriers 4 → 0; one chargeable file added. The verdict and its price are stated in D1 |
| R5 | nothing stored changes; the admin stub stands; the list readers do not move |

### Vector gates

- **structure** — ST1–ST6 re-checked over the grafted whole. ST6 carries a named split trigger: when
  the previous-published read arrives, the adapter splits by argument family, not by world.
- **contract, the other-side-misbehaves gate** — *slow* and *down* are N/A and verified as such: every
  call this touches is an in-process local-API call, so no timeout exists to name and "Payload down"
  is "this process down"; this design adds no read and the latency profile is byte-identical. *A shape
  it did not promise* is the live case and is what decides between the candidates: the config can be
  rewritten after we read it, so every world is derived per call from the registered config and the
  one config-time carrier is deleted; a JSON-cloned collection still answers, because only booleans are
  read. *The same message twice* — a persisted intent naming the published read for a now-flat
  collection resolves to a mismatch at the single parse site and fails the run visibly.
- **headless-cms** — HC2 binds as an invariant and is what rules out holding Payload's argument
  vocabulary in the payload-free core. HC1, HC3 and HC4 are advisory here and recorded under risks;
  HC4's subject, the list readers deciding visibility on the published row, is deliberately left to the
  sanctioned step 3.

### Decisions (ADRs)

#### D1. Two layers split by vocabulary, not by layer count

- **Context:** the core's payload-free promise is enforced by an import zone (`oxlint.config.ts:67-88`)
  and an import regex (`src/core/__tests__/no-payload-boundary.test.ts:17`). Neither can see a literal,
  so a Payload argument written inside the core passes every existing check.
- **Options considered:**
  - one file in the core holding both the world taxonomy and the Payload argument constants (thin-contract)
  - two layers composing at one call, the Payload constants private to the server adapter (anti-corruption-layer)
  - a separate file for the read constant alone — rejected by both candidates: six lines do not earn a module
- **Decision:** the two-layer split. The core holds the taxonomy and the rules in plugin tokens; the
  server adapter holds the detection and the one place tokens become Payload arguments. The one-file
  option is **disqualified**, not outscored: it moves `draft`, `fallbackLocale`, `publishSpecificLocale`
  and `status` into the one zone of this codebase with a written promise to be free of them, past the
  only mechanism that enforces it, and against the sanctioned decision that the world module is
  payload-free. That leaves one candidate standing on this point; it is recorded as a decision rather
  than an open question because three options were weighed and the loser failed on a stated invariant.
- **Consequences:** `src/server/shared/payload/` gains one file — **the whole chargeable cost of this
  design**. Every rule answer crosses one token-to-argument lookup, total over closed unions, which
  cannot throw. The codebase gives up the one-file reading experience where a reader jumps to a cell and
  sees the literal; the cell now names a token and the argument is one hop away.
- **Reversible:** yes — two constants moving between two files.
- **Guarded by:** the existing core import zone and boundary test. Their limit is honest and is why D4
  exists: both are import checks, so neither would catch a Payload literal smuggled into the core.

#### D2. A rule is a cell in one mapped table, in the plugin's own words

> **Retracted 2026-11-20.** Both reasons recorded below for rejecting the plain union turned out
> not to hold. The enumeration a reader reads off is the `World` union itself, which the compiler
> maintains, and the meta-test that was said to need rows was measured and caught nothing: with a
> third variant planted in `World`, the world suite stayed green at 21 of 21, and both proof-column
> rows named the file containing that very meta-test. The table is removed and the guard rebuilt in
> the test, where a missing key in a record over the union's own `kind` fails the type-check. See
> *Retracted after the build*.

- **Context:** R2 asks for one enumerable place. The sanctioned design fixes the table at two rows and
  records that a world differing in what "published" *means* is a refusal, not a row.
- **Options considered:**
  - a mapped type over a subject union, reads included, a missing cell failing to compile (thin-contract)
  - a table of plugin-word answers with the reads carried separately on the world value (anti-corruption-layer)
  - a bag of named booleans — rejected by both candidates as the thing the owner ruled out
  - a rule engine of condition-and-answer objects — rejected: a runtime interpreter, and a reader can no longer jump to a cell
  - no table at all, a plain two-variant union carrying its answers as fields — raised at adjudication, not proposed by either candidate
- **Decision:** the mapped table, with the answers as plugin tokens. The reads go **in** the table, so a
  reader enumerating it sees "which version do we read" rather than finding it on a value elsewhere.
  The plain-union option is rejected for a stated reason rather than taste: R2 asks for an enumeration a
  reader can read off, and the sanctioned `provedBy` meta-test needs rows to iterate over, which a
  union's variants are not. The table is therefore justified by R2 and the meta-test — **not** by
  extensibility, which the sanctioned two-row decision contradicts.
- **Consequences:** adding a subject forces both rows to answer it or to declare it layered-only, paid
  at compile time by whoever adds it. Adding a *row* is known to be expensive and the table says so in a
  line, or a future reader adds a row where a refusal belongs.
- **Reversible:** yes — a type and a literal in one file.
- **Guarded by:** the mapped type itself, since a missing cell fails the type-check, plus the `provedBy`
  meta-test. For the vocabulary rule — that an answer is a token and never a Payload argument —
  **nothing mechanical**: no analyzer rule inspects a literal, and the core import zone does not see
  object contents. The closed per-subject unions guard membership, not naming.

#### D3. The world is derived per call, and the carriers go

- **Context:** `keepsDrafts` is built at config time and consumed at request time, while `run.ts:39`
  reads the registered config — two owners of one fact, with an in-repo mechanism that makes them
  disagree.
- **Options considered:**
  - per call from the registered config, carriers left standing (thin-contract)
  - per call, with the config-time carrier deleted and the enqueue route asking at request time (anti-corruption-layer)
  - building the world map at boot — rejected by both: the host can skip boot initialisation entirely
  - resolving at config time — rejected by both: it reads the object before sanitisation and before later plugins mutate it
- **Decision:** per call, no cache, nothing on `custom`; `keepsDrafts` and its three declaration sites
  deleted; the one-line wrapper around the publish gate deleted; the task builder takes the world
  instead of a boolean. This is the only part of the capability that fixes a live defect rather than
  tidying, which is why it is its own decision rather than a consequence of another.
- **Consequences:** **a named behaviour change, not a refactor.** A collection whose drafts were added
  by a later plugin is now read correctly at request time, where before the enqueue route treated it as
  flat. It ships with that sentence in its commit body rather than buried in a no-behaviour-change step.
  Eleven test files construct the carrier and move onto a world-shaped fixture — the largest single cost
  in the plan.
- **Reversible:** yes — reverting restores the carrier; nothing stored, nothing published.
- **Guarded by:** the lint zone making the adapter the only permitted importer of the version
  predicates, which makes rebuilding a config-time carrier fail at edit time, since any such carrier
  must call one. The zone must be appended **after** the existing translator zones and restate the core
  boundary rules it overlaps — options replace and the last matching override wins, so a carelessly
  placed zone silently switches the core boundary off. Its discrimination is proved the way the house
  already proves zones: plant a file in the zone and read whether the analyzer refused it.

#### D4. Unbuildable by absence of a key; unforgeable by brand

- **Context:** R3 needs the illegal pair not to compile. R1 needs no reader to hand-write the
  arguments — and no analyzer rule sees a literal, a source scan is already defeated by the two-line
  spelling in `targetDocument.ts`, and the owner's instruction is to remove the reason rather than
  police the symptom.
- **Options considered:**
  - absence of the key on the union, the one persisted-data boundary refused at a single parse site (thin-contract)
  - the same, plus a named mismatch outcome failing the run visibly (anti-corruption-layer)
  - a read-argument function that throws on the illegal pair — rejected: a runtime check where a type works
  - a result-returning call — rejected: every call site would handle an impossible case
  - a source-text scan for the literal — rejected by the owner, and defeated by the two-line spelling
  - a branded read-argument type minted only inside the adapter — raised at adjudication, proposed by neither candidate
- **Decision:** absence of the key, with the named mismatch at the one runtime boundary, **plus the
  brand**. The brand is the only mechanical check available for R1, and the device already exists in
  this codebase, in one of the offending files.
- **Consequences:** every version-picking read commits to a plugin-owned wrapper, because the brand
  only bites on a parameter we type — which is exactly "remove the reason to write the arguments".
  **What it does not buy, stated rather than implied:** a brand-new direct call written elsewhere still
  compiles, because Payload's own signature accepts a plain object. That residue has no mechanical cure
  here and the design does not claim one.
- **Reversible:** yes — a type and a mint function; deleting the symbol downgrades the guard without
  changing one runtime value.
- **Guarded by:** the type-checker, through the branded parameter on each read wrapper — planting a
  hand-typed literal at any of the three production sites fails the type-check. For a new direct call
  elsewhere: **nothing, and the reason is recorded above.**

### Build sequence

1. **The world and its first two readers.** `core/domain/world/world.ts` (the kinds, the switches, the
   resolver, ~~the supported table with its proofs, the subject union and the rules table~~ — struck
   2026-11-20, see *Retracted after the build*) and
   `server/shared/payload/worldOfCollection.ts` (detection, the token-to-argument map, the branded
   mint). `sourceDocument.ts` and `localesHoldingContent.ts` move onto the minted read, each keeping its
   access half separate. · covers: R1, R2, R3 · incremental
   · *verify:* the arguments reaching Payload are byte-identical — the existing assertions at
   `shared/payload/__tests__/localesHoldingContent.test.ts:42-43` and `translationStub.test.ts:215` pass
   unchanged; planting a hand-typed literal at either reader fails the type-check; lint and the unit
   suite at their recorded baselines · *rollback:* revert.
2. **The third hand-written read.** The target-locale read at `targetDocument.ts:131-140` moves onto a
   wrapper taking the branded type, so the brand binds all three production sites. · covers: R1 ·
   incremental
   · *verify:* the argument assertions in the translate-document handler tests are unchanged; the plant
   test at this site now fails the type-check · *rollback:* revert.
3. **The layer takes the world.** `resolveTargetLayer` becomes `layerOf(world, targetLng)`; the
   `payload/shared` import leaves the file; `run.ts` calls the adapter on the registered config. The
   layer union and its names stay where they are. · covers: R1, R3 · incremental
   · *verify:* the layer contract test is green on the new signature, including that publish is absent
   on the flat variant · *rollback:* revert.
4. **The carriers go.** Delete the drafts set and its three sites; the enqueue handler asks the world at
   request time; delete the one-line publish-gate wrapper; the task builder takes the world; the hook
   drops its `payload/shared` import. · covers: R1, R4 · **incremental, and behaviour-changing in one
   named case**
   · *verify:* the eleven test files that construct the carrier move onto a world fixture and stay
   green; one new test pins the late-rewrite case — config-time flat, registered layered, treated as
   layered · *rollback:* revert.
5. **The guards.** The lint zone naming the adapter as the only permitted importer of the version
   predicates, appended after the existing translator zones and restating the core boundary rules it
   overlaps; ~~plus the `provedBy` meta-test~~. · covers: R1, ~~R2~~ · incremental
   · *verify:* plant a file in the zone and read whether the analyzer refused it ~~; the meta-test red
   before a proof exists and green after~~ · *rollback:* revert the config block and the test.
   · **2026-11-20:** the meta-test half is struck — see *Retracted after the build*.

Steps 1–3 are byte-identical at the Payload boundary. Step 4 is the only one that changes behaviour.
Step 5 must not land before step 4, because the zone bans an import that steps 3 and 4 are still
removing.

### Framing gaps found during adjudication

1. **What happens to the drafts carrier was never a decision point.** It is the only *stale* reader of
   the host config — a second owner, not a duplicated literal — and the only part of this capability
   that fixes a live defect. One candidate resolved it as a side effect of its priority and the other
   left it standing; it deserved its own question from the start.
2. **Whether the access half and the version half of a read may travel together** was never asked. Two
   readers spread different access decisions beside the same version constant, so an entry returning one
   object would hand an access override to a caller that wanted a version. The design states it as a
   constraint on the entry's shape; the framing should have asked.
3. **Whether the layer module survives as a name** was never asked, and it is the entire file-count
   swing the selection criterion turns on. The two candidates answered it in passing, which is why their
   counts stopped being comparable until adjudication verified both.

### Open questions / unresolved

- **The file-count reading of the selection criterion is the owner's to overrule.** This design is one
  chargeable file heavier and twelve forks lighter. The adjudication ruled that forks govern, because
  the ask counts decisions rather than files, and because the alternative's net-zero was bought by
  putting the adapter in a file whose subject is something else — which also widens the one lint zone
  that holds R1. If the owner rules that files govern, the only legal route to net zero is folding the
  layer module into the adapter, at the cost of promoting a one-consumer type into a shared module.
  *Blocks: nothing; it reshapes step 3 if taken.*
- **The residue the brand cannot cover.** A newly written direct Payload call with hand-spelled version
  arguments still compiles. No mechanical cure exists in this codebase. *Blocks: nothing; it is a claim
  this design must not make.*

### Accepted deviations

One, taken after the build rather than at adjudication — R2 is dropped, and the design ships without
the enumerable place it asked for. It is recorded in full below rather than as a line here, because
it retracts a load-bearing decision as well as a requirement.

Nothing else deviates: the disqualified option cites no sanctioned decision and no owner override, so
it is rejected on an invariant rather than excused as a deviation.

### Retracted after the build

**R2 is dropped and D2 is retracted. Owner's decision, 2026-11-20.**

The rules are not listed in one enumerable place. They live in three ordinary conditionals, at
`enqueue-translation/handler.ts:60`, `translate-document/targetLayer.ts:35` and
`auto-translate/AutoTranslate.policy.ts:82`. The design's own `WORLD_RULES` table was deferred at step
1 to "the step that adds the write and publish subjects"; those subjects arrived as those three
conditionals, and the table never did.

What stood in for it until now was the two-row supported-world table with its proof column. It is
removed, for three reasons, each measured rather than argued:

- **It caught nothing.** A third variant added to `World` left the world suite green at 21 of 21. The
  only type error came from an unrelated function that narrows on one variant and then reads
  `autosave` — an accident of how that function is written, not a guard the table provided.
- **Its proof column proved itself.** Both rows named the file holding the meta-test that read them,
  and the checks on that column asserted only that the path ends in `.test.ts` and exists on disk.
- **It was a second hand-written copy of a list the compiler already keeps,** and it shipped: the
  published package carried it in `dist/core/domain/world/world.js` and `world.d.ts`, although no
  production code and no package entry point ever named it.

What replaces it is smaller and real. In the world's own test, a record over the union's `kind`
names each world once. A new variant leaves a key missing, which fails `check-types`, because the
type-check configuration includes test sources. Adding the key then fails the test unless some
combination of host switches actually produces that world. Both halves were demonstrated by planting
and reverting.

The cost accepted: with two kinds there is no enumeration to read off beyond the union, and a third
kind would still fall into one of the two existing branches at each of the three conditionals until
its author changes them. The guard makes that author's change impossible to forget; it does not make
it unnecessary.

### Rejected / grafted (for the record)

- **Payload's argument vocabulary held in the payload-free core** — disqualified on the leading vector's
  translate-at-the-edge invariant and the stack pack's concrete form of it, and against the sanctioned
  decision that the world module is payload-free. Aggravated by being unguardable: the core boundary is
  two import checks, and neither sees a literal.
- **The adapter living inside the collection-ids module** — rejected: it gives one file two subjects and
  widens the lint zone that holds R1 to a file containing unrelated readers.
- **Deleting the layer module to reach net-zero files** — tested as a graft and withdrawn: its function
  has one production consumer, so promoting it into a shared module is the forbidden direction.
- **Building the auto intent from the world** — proposed in different forms by both candidates and
  rejected: it reopens a sanctioned decision without citing a permitting one, and it changes the
  recorded field the legacy shim reads to tell an auto row from a manual one. The improvement both were
  reaching for arrives anyway, because publish exists only on the layered variant.
- **Grafted from thin-contract:** the single mapped table with the read subjects inside it and a missing
  cell as a compile error · the framing that the single parse site is the only runtime boundary.
- **Kept from anti-corruption-layer (the spine):** the two-layer split with the Payload constants at the
  edge · per-call derivation with the carrier deleted · the named mismatch outcome · the layer module
  keeping its union and its contract test · answers as closed unions of plugin tokens.
- **Raised at adjudication and adopted:** the branded read-argument type — proposed by neither
  candidate, and the only mechanical check available for R1.
