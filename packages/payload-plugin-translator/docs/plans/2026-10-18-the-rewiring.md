# Architecture design — rewiring the plugin for the next major

**Date:** 2026-10-18
**Status:** designed. Implementation pending approval.
**Kind:** public API change across four ports, plus one internal correction. Next major.
**Supersedes:** parts of
[2026-08-21-translation-mechanism-kernel-extraction.md](./2026-08-21-translation-mechanism-kernel-extraction.md)
— see §7. That document keeps everything about the kernel itself; what moves here is everything it
says about strategies, and its open question 5.
**Verified against:** [2026-10-18-kernel-plan-verification.md](./2026-10-18-kernel-plan-verification.md)

---

## 1. What this is

The plugin has extension points for **surfaces** — a host supplies its own translation service, its
own dispatcher, its own access guard, its own routes and admin controls. It has none for
**behaviour**: nothing can take part in a translation itself.

One thing already does. Provenance is wired into the translation worker by name, in four lines
(`translate-document/handler.ts:121,122,150`): it fingerprints the source before the translation and
writes its record after the save. Those four lines are the only reason `skip_existing` can refresh a
leaf rather than only fill an empty one.

This design turns those four lines into a declared seam, with provenance as an ordinary tenant
rather than a special case — and settles three ports that have to change in the same major anyway.

Decisions are prefixed by subject: **D** the module seam · **R** the runner port · **S** what a run
translates · **P** the provider port · **F** internal follow-ups · **O** still open.

---

## 2. Decisions — the module seam

**D1 — a chain of modules, ordered by the host.** Modules are listed in configuration; list order is
execution order, and that order resolves conflicts: the last module to set a value wins.
*Rejected:* modules declaring which verdicts they answer, with the plugin refusing two answerers at
boot. A chain already answers "who wins", and one verdict with one answerer exists.

**D2 — three positions, three state types.** Before the translation, after it but before the save,
and after the save. Each position has its own state type.
*Rejected:* one shared state across all three — at any position half its fields would be
meaningless, which is a type whose fields the function ignores.

**D3 — positions one and two are a chain; position three is a fan-out.** The first two take the
state and return it. The third returns nothing: the document is saved, so nothing can be changed and
there is nothing to pass on. A return value there would be unused in a published type.

**D4 — a module's own state travels in `notes`, keyed by module name.** Provenance computes a
fingerprint at position one and writes it at position three.
*Rejected:* a field on the module. One instance serves every translation and the scheduler takes up
to fifty jobs per pass in one process, so a second translation overwrites the first's value at any
await — intermittent, and only under load.
*Rejected:* a board every module can read. That is the contract-less extension point this design
exists to avoid.

**D5 — built-in modules always run before host modules**, at a position the plugin fixes.
*Why:* provenance's write half is in the chain; its read half is not — the staleness endpoint reads
the source document straight from the database and hashes it there. If a transforming module ran
first, the written hash and the recomputed hash could never match, and every document would read as
out of date, with no error anywhere.

**D6 — provenance becomes a module with no privileges.** Switched on by configuration, built on the
public module interface and nothing else. Anything it needs that the interface lacks is a hole in
the interface, never an exception for the built-in. It is then the standing proof the seam suffices.

**D7 — a module is server-side; the admin interface is a separate axis.** Modules contribute routes,
collections and participation. Components are declared in their own option, and whoever declares one
is responsible for the server wiring behind it — the bargain Payload itself makes.
*Why:* a component runs in the browser and is loaded by path; bundling it into a module made one
object answer for two unrelated things.
*Supporting measurement:* provenance could not have contributed its interface anyway — staleness is
a state a status row can take (`client/entities/translation/model/statusRows.ts:77`), a field on the
shared row type (`model/types.ts:78`), an action inside that row
(`TranslationStatusList.tsx:54,146`), and a cache key three unrelated mutations import to invalidate.

**D8 — contributing endpoints is in scope.** The two staleness routes are already standalone
factories and nothing else in the bundle reads them.

**D9 — a module declares its own collection, not arbitrary config changes.** It cannot reach
collections it does not own.

**D10 — a failure after the save never fails the translation.** Logged and swallowed; the document
is already written and failing would only replay a finished write. *Exception:* a failure that may
have taken the caller's transaction with it propagates regardless.

**D11 — modules must survive being run again.** The queue-backed runner replays a failed job, three
attempts by default, and positions one and two run again each time. The inline runner never retries.
Recorded as a rule rather than a "this is a retry" flag: one less promise, and stricter.

**D12 — levels dissolve into modules.** No separate `levels` option and no separate concept. A level
was a module with only a setup half, and once components move out (D7) nothing distinguishes them.
*Already half-true:* of the three levels, the field one contributes no component today — its control
is registered on the field declaration.

**D13 — three levels become two server modules and two components.** The document and collection
levels register the *same* route bundle, which is why the builder deduplicates endpoints by method
and path at all. With components separated they are indistinguishable and collapse into one.
*Follow-up:* endpoint deduplication loses its original reason; keep it as insurance, but its
docblock stops being true.

**D14 — no defaults; the list is written out, and may be empty.** An omitted option silently meaning
two surfaces goes away.
*Why empty is allowed:* modules are the only source of routes, but auto-translate needs none — it
runs from a save hook straight to the dispatcher. "Translate on save, no admin controls" is a real
headless setup.
*Migration:* breaking for every host that omitted the option. It must fail at boot with the answer
in the message, never start quietly empty. Gets a `DEPRECATIONS.md` entry.

**D15 — the option is called `modules`; "pipeline" is not reused.** Two of three entries do no data
processing, and `TranslationPipeline` already names the core's five stages. The concept the name
reached for is the `translation` member of a module; the pipeline is what those compose into.

**D16 — the two server modules are named by what they translate.** `documentTranslation()` registers
the six whole-document routes; `fieldTranslation()` registers the single synchronous field route.
*Named by the unit, not the mechanism:* "queued vs inline" describes the real difference but is
false under the inline runner. What a module translates does not change with the host's
configuration. The six stay one module — submit, inspect, cancel is one surface.

**D17 — a module declares a route; the plugin builds it.** A module returns a method, a path and a
handler. The plugin mounts it under the base path, wraps it with the access guard and the error
handler, and assembles the per-request context.
*Why — the guard:* every one of today's nine routes applies `withAccessCheck(withErrorHandler(…))`
by hand, in nine separate places. An external module that forgets ships an unguarded endpoint that
writes documents and spends the host's money. Here forgetting is impossible.
*Why — the context:* the dispatcher and the translation service move from boot to request time,
where the handler uses them, so the setup context narrows instead of widening and loses the guard
and the base path too.
*Rejected:* a module declaring the dependencies it needs — a name-to-type registry and a boot check
for three consumers, leaving the guard problem unsolved.

**D18 — two run-time contexts, one extending the other.** A position receives `ModuleIo`: the
database, the caller's scope, a logger. A route handler receives `ModuleRuntime` — that plus a
dispatcher bound to the request and the configured translation service. A position has no use for a
dispatcher, and handing it one would claim a dependency the code never reads.

**D19 — a run's shape is internal, and no published type names it.** Two shapes exist: *translate
and save* (document, collection, source-locale change) and *translate and return* (the per-field
control, which hands text back to the form and writes nothing). Measured, they share one step out of
eleven — the core pipeline. They are already separate code in separate files.
*Splitting them into a declared mechanism later breaks nothing*, provided three things keep holding:
the host configures one module list, no published type names a shape, and the runner stays a port the
plugin attaches to whichever shapes it chooses.
*Rejected for now:* a registry of pipeline steps with a dispatcher. Steps in a registry need one
signature, hence one state, and the two shapes' states barely overlap — the shared state refused in
D2 and D18.
*Three defaults that must be written down, or they read as promises:* the module chain runs on
translations that **save** a document; the configured runner and the lifecycle callbacks never see a
per-field translation; a per-field translation therefore leaves no trace at all while still spending
money at the model. The last is an accepted cost.
*Revisit on a third shape, not a third source* — auto-translate was a new source and required
nothing: same shape, different selection.

**D20 — the browser is told what this installation can do, as abilities.** Which routes exist now
depends on what the configured runner declared (R3) and which modules are installed, so a fixed set
of controls would draw buttons that answer with an error. The plugin ships an ability set to the
admin through the global provider that already carries the base path, and a control that has no
ability for what it does is **not rendered**.

```
{ basePath, abilities: { inspect, cancel, rerun, staleness } }
```

*Why abilities and not "does this route exist".* A route is an implementation detail of an ability:
a path can change, or an ability can come to need two routes, and every check that named a path
would break. An ability also answers things a route list cannot express without the browser knowing
what each path means — `staleness` depends on whether a module is installed, not on the runner.

*Computed, never hand-maintained.* At boot the plugin knows exactly which routes it registered and
what each one required. An ability is present when every route serving it was registered. Routes are
the input, abilities are the output, and the browser never sees routes — so the two cannot drift.

*Ability and permission are different questions with one answer.* An ability says what this
installation can do, settled at boot; the access guard says whether this user may, settled per
request. A control can be missing for either reason, and **both mean absent** — not disabled, not
greyed. One rule for the admin, and no distinction the reader does not care about. Splitting them
later is additive; merging them later is not.

*Where it lives:* in `ComponentContext`, beside `access` and `settings`, so a host's component reads
the same facts the built-in ones do instead of drawing blind.

**D21 — the built-in part of the chain is assembled per trigger.** The host's list stays one list
(D19), and host modules run on every translation. The **built-in** modules do not: which of them are
in the chain is decided when the run is assembled, by whoever is starting it.

*Why — found by modelling scenario 7, and settled by the owner.* When a person ticks fields, the
run must translate those fields, with nothing second-guessing the choice. When auto-translate fires,
nobody chose, and the run should cover only the fields whose source has changed. Two drafts tried to
express that difference as a rule a module obeys, and both broke on a second tenant. Expressed as
composition it disappears: the shortening module is simply not in the manual assembly.
*D19 still holds* — the middle does not learn who called it. The assembly knows, which is where
that knowledge belongs.

**Provenance therefore splits into two jobs, switched on separately:**

| | What it does | Where it runs |
|---|---|---|
| the recorder | after the document is saved, stores a fingerprint of each field's source text | **every** assembly that writes — otherwise the out-of-date marker stops working for everyone |
| the shortener | before the translation, drops fields whose source has not changed since that locale was last translated | the auto-translate assembly |

The two were one switch because they share a store, not because they are one job. The comparison
reads what a previous run's recorder wrote, so the recorder cannot be switched off for a trigger
that uses the shortener — there would be nothing to compare against next time.

*Cost:* D5's "built-ins before host modules" becomes "the built-ins **of this trigger**, before host
modules". The built-in set is no longer a single list.

**The decision has to survive the queue.** The chain is assembled in the worker, minutes after the
request; so what the assembly should be is recorded on the work item and read when the run starts.
The stored value names **the kind of run**, not who started it:

| Value | Means | Written by |
|---|---|---|
| ordinary | translate what was named, or everything if nothing was | an editor, the collection dashboard |
| out-of-date only | translate the fields whose source has changed | auto-translate, the refresh button under the staleness marker |

Naming the kind rather than the trigger is what lets a person deliberately ask for the second kind.
The refresh button is exactly that case: a person presses it, and it means "bring the stale fields up
to date" — today it achieves this with `skip_existing`, which S1 removes, so it needs this value to
keep working.

*Why this is not the strategy coming back.* A strategy was resolved **inside the pipeline**, by a
port with two implementations, and one of its values meant something different again when provenance
was off. This value is resolved **when the chain is composed**, has no port and no implementations,
and the pipeline never sees it. One rule keeps the distinction from eroding: **the run kind does not
reach the pipeline — only the assembler reads it.**
*With no provenance installed, the second kind silently means the first.* Nothing can tell what
has changed, so a run asking for the out-of-date fields translates every field and overwrites
whatever a reviewer corrected. The overwriting is accepted; being silent about it is not. The
effective-config line at boot (R4) has to say so — *auto-translate is on for `posts`, and with no
record of what was translated, every source save re-translates every field.*
*Found by modelling scenario 8.*

*Found by modelling scenario 5:* the shared status row holds actions drawn from four different
sources — the row itself needs `inspect`, cancel needs `cancel`, run-now needs `rerun`, dismissing a
staleness marker needs a provenance route — and O5's check cannot see any of them, because they sit
inside a component rather than being declared.

**D22 — a module contributes instruction lines to the system prompt.** `BeforeTranslate` gains
`instructions: string[]`. A module appends to it; the plugin joins what every module left and the
joined text becomes part of the prompt sent with the request. The field exists at the first position
only — once the model has answered, an instruction means nothing.

*Why — found by modelling issue #142, translation style controls.* Three of that epic's capabilities
— a preferred translation for a term, a forbidden one, and tone — cannot be enforced by substitution.
They are a request written in words, and words reach the model only through the system prompt.
Without this field a glossary installs as **two unrelated options**: a module for the half that can
be enforced (masking a protected phrase before the call and restoring it after, dropping a banned
field from the selection) and a `systemPrompt` builder for the half that can only be asked for.
Nothing connects the two, the term collection is read twice from two places, and a host who wires one
and forgets the other gets silence rather than an error.

*Why this is not a third author of prompt text.* The plugin already appends its own text after the
host's builder has run — the inline-marks rule is joined to every prompt, custom or default
(`buildSystemPrompt.ts:81`). The same join gains a second input; no new author appears.

*Ordering is D1 unchanged:* modules append in list order, so the last module's lines sit closest to
the end of the prompt.

*What it costs:* P5 stops being true as written. See §5.

**D23 — the ability set is known at boot and readable in `setup`, not only in the browser.** D20
ships abilities to the admin so that a control with no ability behind it is not rendered. That rule
covers controls React draws. It does not cover a control that exists before the browser does: an
admin screen and its navigation entry are added to the Payload configuration during a module's
`setup`, and once registered the entry is in the menu for everyone.
*What goes wrong without it:* a host whose runner does not declare `inspect` — a remote queue that
accepts work but cannot be queried — correctly gets no cancel and no status buttons, and also gets a
navigation entry opening a screen whose only request has no route behind it.
*Therefore:* `ModuleSetupContext` carries the computed ability set, and a module decides there
whether to contribute its screen at all. Same facts, two reading points, one computation — D20's
"computed, never hand-maintained" is unchanged.
*Found by modelling issue #49, the cross-collection dashboard.*

---

## 3. Decisions — the runner port

Three records already carried the same complaint from different angles: a deferred follow-up saying
`findByCollection` is an unreasonable demand on a remote queue
(`2026-10-06-lifecycle-run-context.task.md`); a composition rule saying the inline runner silently
answers status reads with emptiness (`2026-07-29-config-combination-rules.md`, M2); and three
commands sharing one interface with a query.

**R1 — the mandatory core is one method.** `enqueue`, returning a receipt, plus the standing
obligation to report every outcome. `cancel`, `run` and `findByCollection` become declared
capabilities.
*Measured:* of the four methods, three are called only from routes — `cancel` by the two cancel
routes, `run` by the run-now route, `findByCollection` by three status and cancel routes. Nothing in
the translation path calls any of them. A runner that only accepts work still translates, still
reports outcomes, still lets provenance record; only the admin goes blind.
*Cancel goes further than the earlier note, which kept it mandatory.* The inline runner's no-op is
honest — by the time `enqueue` returns there is nothing to stop. A remote queue that cannot recall
accepted work is different, and there a no-op is a lie: the button says cancelled, the translation
arrives anyway. A control that cannot work should not be shown.

**R2 — capabilities are declared on the provider, and tied to the runner by type.** The declaration
cannot live on the runner: capabilities are needed at boot to decide which routes exist, and at boot
there is no runner. A type parameter makes declaration and implementation agree — declaring
`["inspect"]` obliges `create` to return something with `findByCollection`.
*Found by writing it out:* the inline runner must not declare `rerun` — its `run()` answers
`not_found` every time, so the admin shows an action that can never succeed. Declaring capabilities
removes it as a side effect.

**R3 — a route declares what it requires; the plugin filters and narrows.** Each route carries
`requires`. The plugin registers it only when the runner declares all of them, so a module contains
no conditionals. The same parameter narrows the dispatcher inside the handler, so calling a method
the route did not require is a compile error. Cancelling across a collection needs both `inspect`
and `cancel`. A missing capability means **no route** — not a route answering "unsupported", and
never today's silent emptiness.

**R4 — durability is not a capability.** Both runners can answer what is happening, so both declare
`inspect`; only the queue-backed one remembers across a restart. A capability earns its place when
the plugin behaves differently, and a panel cannot show history that no longer exists. After a
restart the inline runner's "nothing in flight" is *true* — the process died and took the work with
it; what is lost is the record of past failures. The fact goes in the effective-config line at boot.

**R5 — the port states what a runner can do, never what it costs.** `inspect` answers "can you", not
"how expensive". The obvious bound is a row limit, and earlier research established it as a trap:
status is the latest run *per locale*, so "the newest N rows" silently drops a locale whose last run
is older.
*One defect to fix on the way:* the docblock on `TaskFilter.documentIds` still says the field is
applied in memory. It is not — the queue-backed runner sends it to the database as a condition over
both the current and the legacy reference shape (`jobsWhere.ts`, `ofDocuments`), keeping an in-memory
pass only as a second check.

**R6 — when a run gives up, a locale it never attempted is re-queued, not reported failed.**
Today the workflow loops its locales and rethrows on the first one that fails, so the locales after
it never run; when the last retry is exhausted, every locale the run still owed is reported `failed`
with the error that ended it. A locale that was never tried is not a failure — it is work that has
not happened — so it goes into a fresh run instead.
*Why — found by modelling scenario 4.* A run covers `fr`, `de`, `es`; `de` fails and the job
retries; meanwhile an editor asks for `it`, which merges into that run (S6). When `de` exhausts its
attempts, the host is told `it` failed, although nothing ever attempted `it`.
*Why not simply refuse to merge into a failing run.* That was the first fix considered, and it
trades down: refusing creates a second live run for the same document, and a second live run is the
hazard S5 exists to prevent. See the measurement under S5.
*This applies to giving up, and to nothing else.* Cancellation also ends a run with locales owed,
and there the rule must not fire: cancel means cancel, so re-queueing the untried locales would put
back exactly what was just stopped.

**R7 — `findByCollection` reads a set of collections, not one.** The parameter becomes a list of
collection slugs. Without it the cross-collection dashboard (#49) is one query per configured
collection on every poll, which a remote queue pays for in round trips.
*Why not a new method:* a second read is a second capability every third-party runner must
implement, splitting `inspect` in two to serve one caller. A list parameter stays inside `inspect`
and answers both panels in one call.
*Still bounded:* the list is the plugin's configured collections, never "everything the queue holds".
*Found by modelling issue #49.*

Four smaller removals ride along, all already in `DEPRECATIONS.md`: the positional document-id array
on `findByCollection`, `enqueue` resolving with nothing, the old two-argument `create`, and
`onFailed` firing once per attempt.

---

## 4. Decisions — what a run translates

Today a run carries a *strategy*: overwrite everything, or fill what is empty and refresh what
drifted. The strategy exists because nobody ever asked the editor which fields they meant, so a rule
had to guess. Issue #48 replaces the guess with a question; these decisions go further than it does.

**S1 — the pipeline takes one input: which leaves to translate.** A set of leaf addresses and
nothing else. `TranslationStrategy` disappears as a port along with both implementations; the
collector takes the set, and the per-leaf question collapses to "is this leaf selected, and is its
source non-empty".
*The groundwork exists:* since the per-leaf receipt landed, every translatable leaf already has an
id-based address (`FieldChunk.idPath`), which is exactly the key a selection is expressed in.

**S2 — a run carries what a person chose, and nothing else.**

| Who starts the run | What the run carries |
|---|---|
| an editor who opened the picker and ticked fields | that list |
| an editor who did not open the picker | nothing |
| the collection dashboard, any number of documents | nothing |
| auto-translate | nothing |
| the out-of-date refresh button | nothing |

**Nothing** is not a third value and carries no meaning of its own. It is the plain fact that no
person named any fields, and it is what makes room for S3.
*Why not simply delete the behaviour the strategies provided:* two paths have no human in them.
Deleting the drift rule outright would make every source save overwrite whatever a reviewer had
corrected in the target locales.
*Where this goes past #48:* the issue keeps `strategy` in the model for those two paths and removes
it only from the forms. Here it leaves the model too, and nothing takes its place in the stored row.

**S3 — the run carries a list of fields or nothing, and a module may shorten it.**
`BeforeTranslate.changedLeaves` becomes `BeforeTranslate.selection?: Address[]`. Absent means
nobody named any fields, and the run starts from every translatable leaf. Any module in the chain
may remove entries. **There is no rule about who wrote the list** — which modules are in the chain
at all is decided by the assembly, per trigger (D21).

*Why no symbolic value.* An earlier draft had the run carry the word `"drifted"` so that
auto-translate could say what it wanted without reading anything. That word is provenance's
vocabulary, and provenance is optional, so it would have appeared in the HTTP enqueue input, in the
stored job a third-party runner must replay, and in the module seam — three contracts that exist
whether provenance does or not. Structurally that is the strategy this section deletes, with one
value instead of two.
*Why no rule about an explicit list either.* Two drafts tried to protect a person's choice with a
rule inside the module — first "provenance never shortens", then "no module shortens a list a person
wrote". Both failed on a second tenant: a glossary that bans a field from being translated must
remove it even when a person ticked it, because that is what a ban means. The protection belongs in
the assembly, not in a rule each module has to honour. See D21.

**S4 — a selection names leaf addresses, and only on a single-document request.** The enqueue input
accepts a selection; a selection together with more than one document is a validation error, loudly.
*Why:* a leaf inside an array or a block has the element's `id` in its address, so the address is
document-specific. The bulk dashboard covers many documents at once, and one such address would
match one of them. A top-level leaf like `title` has no element segment and would match everywhere,
so the restriction is narrower than it looks.
*Why a rejection rather than a second vocabulary:* a rejected input constrains no caller, so
allowing bulk selection later — by permitting addresses with no element segments — is additive by
construction. Building a schema-path vocabulary now would be structure for a need nobody has stated.
*Consequence:* the picker route serves one document's field tree, not a collection's.

**S5 — the selection belongs to a target locale, not to a run.** The stored run replaces
`target_lngs: string[]` with a list of `{ lng, selection? }`. An absent selection means everything.

```json
"targets": [
  { "lng": "fr", "selection": ["title"] },
  { "lng": "de", "selection": ["body"] }
]
```

*Why — found by modelling scenario 1.* `strategy` lives on the run today, so a selection inheriting
its place would be shared by every locale of that run. A second request then has two bad options: a
new run, which puts two concurrent writers on one document, or a union of the selections, which
translates `body` into French when only German was asked for — overwriting whatever a reviewer had
corrected there.
*What it buys:* one live run per document stays an invariant, no concurrent writers, and
`pickHost` needs no selection comparison.

*Measured, because the invariant turned out to matter more than assumed.* Two concurrent runs on one
document lose each other's work **even when they write different locales**. Payload's update
operation reads the whole stored document, merges the incoming single-locale values into it, and
hands the adapter the document with every locale — the `beforeChange` docblock states it outright:
*the input data is the normal document for one locale; the output will become the document with
locales.* So two overlapping runs each read a document that lacks the other's work and each write a
complete document back; whichever commits last silently drops the other locale. This is the shape of
the operation, not of one adapter. Read from the code, not reproduced live.
*Consequence for the host:* Payload's `jobs.enableConcurrencyControl` is not decoration — without
it, two runs on one document can lose work. Worth saying plainly in the README.

**S6 — a second request merges into the live run.** A request for a document that already has a live
run adds its locales and their lists to that run, and a locale already present gains the newly named
fields. **One exception:** a locale whose task is already running or finished cannot be amended —
the workflow does not re-run a completed task — so that locale goes into a new run.

*Where the comparison of source text against the stored record happens:* in the worker, during the
translation, which is where it happens today and where it stays. Scenario 2 established why that
matters. The auto-translate hook runs inside the editor's save transaction; if it had to produce a
field list there, it would read one provenance record per target locale while that transaction holds
its locks. Writing nothing costs nothing, and the reads stay in the worker, where provenance is
already present.

**The surface this touches.** Forty-two files outside the tests carry `strategy`. The heaviest
cluster is the runner, not the pipeline: it is part of the stored job input, read back on every
status query, carried on the receipt and on the host-facing task — and `pickHost` compares it when
deciding whether a live run may absorb new locales. With no strategy to match, `pickHost` loses a
condition and enqueue grouping gets simpler.

---

## 5. Decisions — the provider port

**P1 — two arguments: the data, then the description.** `translate(input, ctx)`. The indexed strings
stay a parameter of their own because the input is the only part the provider is *obliged* to
preserve — the same numeric keys must come back. That is an obligation, not a description.
*Rejected:* one object matching the layer below, where the text is already serialised and owes
nothing back. Here it would hide the port's only real obligation.

**P2 — an absent source language means the provider detects it.** `sourceLng?: string`; the
empty-string sentinel goes. Measured: nothing inside the plugin produces one.

**P3 — how the call is made is a third argument, and it waits.** Anything describing the invocation
rather than the translation — an abort signal, later a deadline — belongs in a trailing optional
`options?: CallOptions`. The rule for what goes there: *what stops meaning anything once the call has
returned.*
*Why not now:* one candidate field, unwired. A trailing optional parameter can be added later
without breaking any implementation or call site.
*Meanwhile:* the reserved `signal` on the completion request is deleted. The transport already
forwards one to the model client (`openAIComplete.ts:118`), so the plumbing is finished at the bottom
and missing only at the top.
*Why `CallOptions`:* every comparable library names the parameter `options` and the type after what
it configures. `RequestOptions` is avoided here because this plugin is full of `PayloadRequest`.

**P4 — the provider port is reshaped after the modules.** The name the new object wants,
`TranslationContext`, is taken by the config-time bundle the levels read, which becomes
`ModuleSetupContext` when levels dissolve (D12).

**P5 — the system prompt stays where it is; the question is closed, not answered.** The kernel plan
asked whether prompt assembly should become something a provider *declares it accepts*. Measured,
that arrangement already exists: the port lives in the framework-free core and knows nothing about
prompts, and `systemPrompt` belongs to each provider's own factory. A provider that cannot use a
prompt has no such option.
*The courier complaint dissolves too:* `document` travels through three functions that never read
it — and so do the two language codes. Carrying what the implementation needs is a port's job; the
shape of the delivery was the defect, and P1 fixes it.

*Amended by D22.* The question this decision closed — whether a provider should *declare* that it
accepts prompt assembly — stays closed. What changes is who writes the prompt: the plugin assembles
it from the host's builder (or the default wording), the lines modules contributed, and the
inline-marks rule. `systemPrompt` remains an option of each provider's own factory, and the port
still knows nothing about prompts, because the lines reach the provider already joined into the
prompt text. P1 is untouched.

**P6 — three fixes fall out one layer down.** The prompt context documents the same empty-string
sentinel P2 removes; `document` can become required once the port demands it; and the port says
`sourceLng`/`targetLng` while the prompt context says `sourceLang`/`targetLang`.

**P7 — a failure is an exception; the nullable return goes.** Three places told three different
stories: the port's return allowed `null` and its documentation asked for it; the recommended way to
build a provider already declares a non-nullable return and throws; and the core, on `null`, raises
`TranslatorBug` — the kind that means *the plugin has a defect*. A provider following the written
contract causes an error blaming the plugin, and that is what reaches the host's failure callback.
The runtime guard stays, reclassified to a provider failure.

**P8 — declaring capabilities becomes required.** The optionality existed so providers written
before capabilities kept compiling, and a major is where that expires. Until then "has not thought
about marks" and "cannot preserve marks" are written identically. The `experimental-inline-marks`
deprecation entry already says a third-party provider that never declares the capability keeps
translating node by node indefinitely — which the same entry calls a defect — with no warning
surface. A required field tells the author at the only moment they can act.

---

## 6. Follow-ups — internal, no interface moves

**F1 — a run reports the leaves it attempted, not the ones that came back.** A model may answer with
fewer values than it was sent, and the reply parser accepts that by design. The applier writes what
came back and leaves the rest. But `PipelineResult.translatedPaths` is built from the leaves
*collected*, so it names the skipped ones too, and the receipt records them as translated.
*What that costs:* a leaf whose target was empty holds the source text, put there by the reconciler
before the model was called. The receipt seals it — the staleness check finds a matching fingerprint
and reports the field up to date, permanently. An already-translated field is not damaged, so the
harm is confined to empty targets.
*The fix needs nothing new:* the keys sent and the keys returned already give the answer inside the
translation stage. One decision sits inside — a leaf made of several strings counts as translated
only when every string came back. The adapter also stops writing to `console`.
*Timing:* this field crosses the module seam, where its meaning is published. The contract must say
*returned* from the start, so the correction lands with the seam or before it, never after.
*Confirmed by modelling scenario 4:* a model that answers with fewer fields than it was sent is not
an error and triggers no retry. Without this correction the unanswered field is sealed by a receipt
and never revisited; with it, the field simply has no receipt and the next run picks it up.
*Conditional on provenance, found by modelling scenario 8.* The self-correction above — no receipt,
so the next run picks the field up — happens only where receipts exist. With provenance switched off
a field the model did not answer keeps the source text and nothing will ever revisit it.

**F2 — a swallowed receipt write becomes a future overwrite of reviewed text.** D10 says a failure
after the save is logged and swallowed, which is right: the document is written and failing would
only replay a finished write. But the receipt for that locale is then missing, so the next run finds
no record, treats every field as changed, and translates the locale again. The text would be the
same — unless a reviewer corrected the translation in between, in which case the correction is
overwritten.
*Why it stays as it is:* the alternative is failing a translation that succeeded, which is worse.
Recorded so the behaviour is a known cost rather than a surprise.

**F3 — "only what is out of date" as a choice in the admin.** Deferred, recorded so it is not lost.
D21 makes a person-started run translate everything it was asked for, which for the collection
dashboard means fifty documents re-translated in full, over reviewed text, at full cost. A tick box
beside the target locales would let a person ask for the out-of-date kind instead.
*Why it is cheap once D21 lands:* the run kind is already a stored value with two cases and the
refresh button already writes the second one. The tick box only chooses which one the dashboard
writes — no new concept, no new field.
*One thing it needs:* with provenance off nothing is ever known to be out of date, so the tick box
must not be shown. D20 covers that already — the ability set reports `staleness: false` and the
control is not rendered.

**F4 — the cross-collection dashboard reads what is happening, not what has happened.** Issue #49
asks for "recent completions" across every configured collection. That is the unbounded archive read
removed from the collection panel in PR #178 — where the `Translated — N` row was dropped and the
read narrowed to work in flight plus failures inside a configurable window — multiplied by the number
of collections. The global screen inherits the same rule, and the issue's "recent completions"
criterion does not survive it.
*Recorded now so the question is settled before the screen is built, not after it is slow.*

---

## 7. What this supersedes in the kernel plan

The kernel-extraction plan stands, with these exceptions:

| In that plan | Status |
|---|---|
| §3 non-goals, the strategies bullet | **superseded by S1.** Strategies are deleted, not relocated. The bullet already said they "reach the primitive through the selection port" — S1 finishes that thought |
| §4.2, the `select?` parameter comment ("the translation strategy, mainly") | **superseded by S1–S2.** The caller computes a selection; there is no strategy to layer |
| §4.3, the consumer table row naming `strategy.shouldTranslate` | **superseded by S1** |
| The `Language.isEmpty` docblock, which says it replaces `SkipExistingStrategy.isEmptyValue` | **partly superseded.** The need survives — selection still asks whether a source is empty — but the thing it replaces will not exist |
| §4.6, "strategies" in the moving glob | **superseded by S1** |
| §9, open question 5 (does the system prompt stay in the provider) | **closed by P5** |

Three measurements in that plan have rotted and are corrected there, not here: the write-back union
has three members and not two, the provider boundary is no longer format-free or Payload-free, and
ADR-3's premise that pipeline chunks carry no location is false. See the verification document.

**One ordering constraint this design imposes on that one.** The module contract is built on core
vocabulary — the field tree in `BeforeTranslate`, leaf addresses in the selection and in the report.
The kernel plan's phase 6 generalises exactly that vocabulary and deliberately breaks the package
API. D6 forbids giving provenance a private interface, so the field tree must be public in the
module contract. Therefore **the seam opens to hosts after phase 6**, never before.

---

## 8. Still open

- **O1 — what a failure before the save means.** Proposal: `onFailure` on the participant,
  defaulting to *fail the translation*, with provenance declaring `skip` so today's tolerant
  behaviour is kept deliberately rather than by default.
- **O2 — how provenance is switched on.** Keep `provenance: true` and assemble internally, or move
  to `modules: [provenance()]` and deprecate the flag.
- **O3 — what the admin does when the staleness route is absent.** Today those routes register even
  when provenance is off. Proposal: the client treats a missing route as *nothing to show*.
- **O4 — what is exported from the package entry.** At minimum the module type and `provenance()`.
  Decided by writing a host module against the draft.
- **O5 — whether a component states the abilities it needs.** Reshaped by D20: a declaration reads
  `needs: ["cancel"]` rather than a path, which survives a route being renamed and states an
  intention instead of an address. The boot check then turns a control that can never work into one
  startup message. Still optional, and narrower than it was, since D20 already stops a control
  rendering when its ability is absent — what a check would add is telling the host at boot rather
  than leaving them to notice a missing button.

Two gaps with no decision yet: removing the exported `TranslationLevel` type needs a
`DEPRECATIONS.md` entry, and the name of the components option is not fixed.

---

## 9. Order of work

1. **Correct the kernel plan's four broken citations** and mark what §7 supersedes. No code.
2. **Remove what is already deprecated** — sixteen entries in `DEPRECATIONS.md`. Doing this first
   means less code to redesign afterwards.
3. **Kernel phases 0–3**, internal. F1 lands naturally in phase 1, where the write-back path is
   rewritten anyway.
4. **Module extraction, internally** — provenance's four lines move into the three positions;
   nothing is exported. Then prove nothing moved: staleness reports the same answers, and
   `skip_existing` still refreshes a leaf whose source drifted.
5. **Kernel phases 4–6** — package split, language registry, vocabulary generalisation.
6. **Open the seam** — export the module type and `provenance()`, accept host modules, and settle
   O1–O5 as part of that change.

Stopping after step 4 is a complete outcome: the inside is clean and nothing has been promised to
anyone outside.
