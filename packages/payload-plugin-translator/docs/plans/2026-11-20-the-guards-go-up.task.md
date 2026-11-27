# The guards go up

Build step: 2026-11-20-the-host-config-becomes-our-rules.design.md #5

## Requirements / Task restatement

Four steps reduced the answers to "does this collection have a published layer?" from four
derivations to one. Nothing yet stops a fifth being written. This step adds the two
mechanical checks the design owes: an analyzer zone that refuses the host's version
predicates everywhere but the one adapter, and a strengthening of the table check so that
claiming a world is supported requires naming something that can actually prove it.

Covers R1 and R2 of the design.

## What already exists — platform · installed · project · verdict

- **The analyzer can restrict a named import**, not only a module: the configuration already
  uses `{ name, importNames, message }` for a third-party client and for framework cache
  helpers. That matters here, because nine files import from the host's shared module and
  only one takes the version predicates from it; a module-wide ban would refuse eight
  innocents.
- **The house proves a zone by planting a file in it** and reading whether the analyzer
  refused — there is an existing suite that does exactly this for the client zones. That is
  the mechanism used here rather than a fresh one.
- **Part of the table check exists.** The first step added two cases: the table lists exactly
  the worlds the resolver produces, and each row's proof path exists. The first is the
  check the design asked for. The second is weaker than it reads — see the decisions.

## Decisions

- **The zone names the two predicates, not the module.** *Chosen:* refuse those import names
  from the host's shared module. *Lost:* refusing the module — rejected on measurement: nine
  files import it, eight for unrelated helpers, and a module-wide ban would make the analyzer
  count rise, which is the sign of a zone that hit the wrong files.
- **The zone is scoped to where the predicates could plausibly appear**, the server and
  composition trees, rather than the whole package. *Chosen:* the narrow scope. *Lost:* a
  package-wide zone — rejected because the analyzer's zone options *replace* rather than
  merge, and the last matching zone wins: a package-wide zone placed after the existing ones
  would silently switch off the core boundary and the traversal-barrel rule for every file it
  matched. The core and the client are already forbidden the host entirely, so the narrow
  scope loses no coverage.
- **Each new block restates what it overlaps.** *Chosen:* the restricting block, the adapter's
  exemption and the test exemption each carry the traversal-barrel rule they would otherwise
  displace. *Lost:* relying on the earlier blocks — rejected for the reason above; it is the
  failure the design recorded in advance and the one this step is most likely to commit.
- **The proof check is strengthened rather than duplicated.** *Chosen:* a row's proof must be
  a non-empty path to a file the test runner collects. *Lost:* adding a second meta-test —
  rejected as building work that exists. *Measured:* today an empty proof path passes, because
  the check resolves it against the package root, and the package root exists. A file that is
  not a test would pass too. *Not taken:* requiring the proof to mention the world it proves —
  a text search over a test file is more machinery without more proof, since a mention in a
  comment would satisfy it.

**Placement.** The zone goes in the repository's analyzer configuration, after the existing
translator zones and before the client ones. The proof check stays in the world's own suite.

**New surface.** None in the package; one named constant in the analyzer configuration.
**Written contract?** None.
**Escalate?** No; the design covers this step.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | A file outside the adapter that imports the host's version predicates is refused | plant such a file in the server tree, run the analyzer on it, delete it | refused, naming the rule |
| AC2 | R1 | The adapter itself is not refused | run the analyzer on the adapter | 0 errors |
| AC3 | R1 | A file importing something else from the host's shared module is not refused | plant one importing an unrelated helper, run the analyzer, delete it | 0 errors |
| AC4 | R1 | The new zone does not switch off the rule it overlaps | plant a server file reaching into the traversal engine's internals, run the analyzer, delete it | refused, naming the traversal rule |
| AC5 | R2 | A world claiming support with an empty proof fails the suite | set a row's proof to an empty string, run the world's suite, restore | red with the empty proof, green restored |
| AC6 | R2 | A world whose proof is not a file the runner collects fails the suite | set a row's proof to a non-test file that exists, run the suite, restore | red, green restored |
| AC7 | — | No type errors | `bun run check-types` | 0 errors |
| AC8 | — | The analyzer count does not move | `bunx oxlint .` | 26 warnings, 0 errors |
| AC9 | — | The unit suite stays green | `bunx vitest run` | 3049 passed or more, 15 skipped, and every added case accounted for |
| AC10 | — | A real boot still answers as before | from `apps/dev`: `bun run test:integration:sqlite` | 278 passed, 2 expected failures, 7 skipped |

## Pre-flight

Run against the tree as this step starts, which is the tree the previous step left.

- **AC1** — a planted server file importing a version predicate was run through the analyzer
  and reported **0 warnings and 0 errors**. *change* — fails now, as it must. The probe was
  deleted after the reading.
- **AC2, AC3, AC4** — not meaningful until the zone exists; each is the companion that proves
  the zone did not overreach. *change* in form; they are run in the build phase.
- **AC5** — resolving an empty proof path against the package root yields the package root,
  which exists, so the check passes today. *change* — fails now, as it must.
- **AC6** — the check asks only whether a path exists, so any file satisfies it. *change* —
  fails now, as it must.
- **AC7** — 0 errors. *invariant* — passes now.
- **AC8** — 26 warnings, 0 errors. *invariant* — passes now, and a rise means the zone hit
  files it was not aimed at.
- **AC9** — 3049 passed, 15 skipped. *invariant plus whatever this step adds.*
- **AC10** — 278 passed, 2 expected failures, 7 skipped. *invariant* — passes now. The two
  expected failures belong to a defect another design fixes; a drop to zero is a finding.

## Risk notes

- **Classified high**, and acted on as high: the change edits a repository-wide analyzer
  configuration whose zones replace rather than merge, where the failure mode is silent —
  a wrong placement disables an existing boundary and nothing goes red. That is why AC4
  exists and why it plants a file rather than reading the configuration.
- The zone cannot stop a file from deriving the answer by other means, for example by reading
  the version configuration directly. It refuses the two named imports; it is not a proof that
  only one derivation exists.
- A second session edits this tree; it is checked before each edit.

## Decisions by the owner

- 2026-11-20 — build the steps of this design in sequence without stopping at each one's
  gate, with the quality pass run against the working tree rather than the review marker.
