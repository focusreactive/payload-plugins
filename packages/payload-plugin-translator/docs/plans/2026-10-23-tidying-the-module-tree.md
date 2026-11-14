# Tidying the module tree

**Status:** proposed · **Follows:** #198, on the same branch · **Decision owed:** which option

## Why

`server/modules/` has grown into a flat listing a reader cannot navigate: the folder tells you a
module exists, and nothing about what each file in it is for. The package already declares a
convention for this — `CLAUDE.md`, "Grouping files inside a module": folders named by role, with the
dependency running one way, `model/` → `store/`, and `payload-jobs-runner/` named as the worked
example. One module follows it. The others do not.

## What the tree actually looks like

Measured 2026-10-23, after #198.

| Module | Files in its root | Lines | State |
|---|---|---|---|
| `provenance/` | **9** | 1930 | the sprawl this plan is about |
| `auto-translate/` | 5 | 1058 | at the edge |
| `task-runner/payload-jobs-runner/` | 4 + `model/` + `store/` | ~2300 | the only one following the convention |
| `task-runner/` (root) | 5 | — | the two ports, plus a stray `toTaskFilter.ts` |
| `task-runner/sync-runner/` | 4 | ~200 | small enough to stay flat |
| `translation-run/` | 3 | 430 | reads as it is |
| `plugin-config/` | 4 | 383 | reads as it is |
| `lifecycle/` | 6 | 309 | reads as it is |

Inside `provenance/` every role tag is mixed into one list: `.collection.ts`, `.module.ts`,
`.service.ts`, `.shapes.ts`, `.store.ts`, `.wiring.ts`, `Cleanup.hook.ts`, `slugGuard.ts`, `index.ts`.

## Option 1 — extend the convention already written down

Apply `payload-jobs-runner/`'s shape to every module that has outgrown a flat listing. The
`Provenance.` prefix goes: inside `provenance/` it repeats the folder.

```
provenance/
  index.ts
  config.ts            <- Provenance.wiring.ts     resolves the option to a module, or to nothing
  module.ts            <- Provenance.module.ts     the two run positions + setup
  model/
    policy.ts          <- Provenance.service.ts    decides what to record and what reads stale
  store/
    collection.ts      <- Provenance.collection.ts
    payload.ts         <- Provenance.store.ts
    shapes.ts          <- Provenance.shapes.ts
    slugGuard.ts
  hooks/
    cleanup.ts         <- ProvenanceCleanup.hook.ts
```

**For:** nothing is invented; the rule and its worked example are already in `CLAUDE.md`, and
`model/` → `store/` is checkable with one grep.
**Against:** `hooks/` is a role the table does not list yet; the dotted tags move from filenames into
folder names, so the "a directory listing reads as an architecture map" claim moves with them.

## Option 2 — keep the nesting, drop the repeated prefix

The cheapest change, and it is a subset of Option 1.

```
provenance/
  index.ts  wiring.ts  module.ts  service.ts  store.ts
  collection.ts  cleanup.hook.ts  shapes.ts  slugGuard.ts
```

**For:** one pass over every module, no new vocabulary, the listing reads as roles.
**Against:** nine files stay nine. It answers "what is each file for" and not "there are too many of
them in one list".

## Option 3 — split by when the code runs

Every module has two halves and the plugin calls them at different times: once while the config is
built, and again on each translation. That is the first question a reader has about an unfamiliar
module.

```
provenance/
  index.ts
  module.ts            the module object, both halves in one place
  setup/               runs once, while the config is built
    collection.ts  cleanup.hook.ts  routes.ts  slugGuard.ts
  run/                 runs on every translation
    fingerprints.ts  receipt.ts
  store/               shared by both halves
    payload.ts  shapes.ts
```

**For:** it mirrors the seam #198 built — the folder answers "when".
**Against:** a third vocabulary beside the two that exist; `store/` belongs to neither half and sits
outside the split.

## Two things to settle alongside, whichever option wins

**Test placement is inconsistent.** Four modules keep tests in `__tests__/`; `lifecycle/` and
`plugin-config/` keep them beside the source (`LifecycleNotifier.test.ts`, `taskMapping.test.ts`,
`PluginConfigBuilder.test.ts`). Pick one and apply it.

**The frame sits among its tenants.** `plugin-config/` and `translation-run/` are not modules — they
are what a module plugs into: `TranslationModule`, `ModuleContext`, `PluginConfigBuilder`, and the
chain runner. A listing of `modules/` gives no sign that two of its six entries are the construction
rather than its occupants. Separable independently of the option above:

```
server/
  modules/     provenance · auto-translate · task-runner · lifecycle
  plugin/      plugin-config + translation-run
```

## Recommendation

**Option 1**, because it is already written down, has a working example, and carries a checkable
dependency rule; inventing a third vocabulary for one sprawling folder is not worth it. Option 2 is
part of Option 1 and is worth doing regardless. The frame/tenant split is cheap and answers the
complaint directly.

## Open

- Which option.
- Whether `hooks/` joins the role table in `CLAUDE.md`, or cleanup lives under `store/`.
- What the frame folder is called, if it is split out — `server/plugin/` collides with nothing, but
  `src/composition/` already holds the public factories, so the two names should not be confusable.
- Whether `task-runner/toTaskFilter.ts` belongs where it is.
