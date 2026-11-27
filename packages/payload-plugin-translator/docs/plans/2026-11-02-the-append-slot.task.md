# The append slot

Build step: 2026-10-28-the-provider-port.design.md #8

## Requirements / Task restatement

`buildSystemPrompt` already has an append slot. It has one hard-wired occupant and a boolean that
names it: `hasInlineMarks?: boolean` appends `inlineMarksInstruction()` after whatever a
`systemPrompt` override returned. The reason that slot exists is written beside it — an override may
ignore `defaultPrompt` entirely, so the wire format must not depend on the host repeating the rule.

R9 (glossary and brand voice) needs the same guarantee for the same reason. Under the shape as it
stands, satisfying R9 means a second boolean and a second branch, and the third such instruction
means a third. The parameter describes its one occupant rather than the role it fills.

This step generalises the slot: `buildSystemPrompt` takes an ordered list of text blocks to append
and stops knowing what any of them say. `createTranslationProvider` decides membership, which is
where the information already is.

The design carries this as **R19**, added 2026-11-02 for the same reason R18 was added on
2026-11-01: a step finished, its surface was read back, and a defect in the shape was named.

**This step is not breaking, and therefore does not have to ship in the major.** It is taken now
because R9 is the next step that touches this file and would otherwise add its branch to the shape
being replaced — not because the window closes.

Out of this step: the glossary and the brand voice themselves, their shape on `TranslationRequest`,
provider `capabilities`, and R15. The README is not edited here.

## What already exists — platform · installed · project · verdict

Nothing new is built. The mechanism exists; this step changes the shape of its one parameter.

The project's precedent for an ordered list of participants is `TranslationModule[]` in `plugin.ts`,
which is a chain the plugin walks in order and guards with `refuseDuplicateNames`. That precedent
was read and **not** followed: a name per member buys an error message and an identity lookup, and
nothing here reads either. The members are text, and order is their only property.

A host that wants to add its own standing instruction already has `systemPrompt`, and `apps/cms`
uses it that way today — `({ defaultPrompt }) => \`${defaultPrompt}\nUse formal language. …\``.
That is the host-side answer and it is unaffected.

## Decisions

**D1 — the slot is internal; no published config field is added.** `alwaysAppend` is a parameter of
`buildSystemPrompt`, composed by `createTranslationProvider`. Rejected: `alwaysAppend` on
`TranslationProviderConfig`, so a host can append text that survives its own override. It loses on
having no caller: the design's scenario review settled that glossary and brand voice arrive on
`TranslationRequest`, which makes the provider — not the host — the party that turns them into
prompt text, and a host that wants its own standing text already has `systemPrompt` and uses it.
Adding the field now would publish a name in the major with nothing to call it, and an unused
published name cannot be removed again without another major.

**D2 — the caller decides membership; the function only joins.** `buildSystemPrompt` appends every
block it is given, in order, each separated from what precedes it by a blank line. It does not
filter, and it does not inspect. Rejected: filtering empty or blank blocks inside the function. That
admits a state no caller produces, and buys a guard against a caller bug the type cannot have —
membership is decided by one `if` at the single call site, exactly as the boolean decided it before.

**D3 — the element is named.** The parameter is `readonly PromptAddition[]`, with
`type PromptAddition = string`. A bare `readonly string[]` in a signature does not say what the
strings are; here they are blocks of prompt text, not keys, locales or ids. The alias stays inside
`shared/` — nothing outside that folder names it, so it is not added to a barrel.

**D4 — the marks instruction moves to the call site, and the prompt builder stops importing the
wire format.** `buildSystemPrompt.ts` today imports `inlineMarksInstruction` from `./wire/`, so the
unit that builds a prompt knows how values are encoded on the wire. After this step it imports
nothing from `wire/`; `createTranslationProvider` — which already computes
`Object.keys(sections.marked).length > 0` — passes the instruction when it applies.

**Placement.** No file is added, moved or renamed. Two files change: `buildSystemPrompt.ts` (the
parameter, the join, one import removed) and `AskModel.provider.ts` (composes the list).

**New surface.** None published. One internal type alias, `PromptAddition`, not exported from any
barrel.

**Shape check.** Fired on two triggers: an exported function changes a parameter, and the new
parameter is optional. Three shapes were counted.

| | `alwaysAppend?: readonly PromptAddition[]` (chosen) | `hasInlineMarks` + a boolean per member (today) | `readonly { name, text }[]` |
|---|---|---|---|
| What the next member of this kind costs | one `if` at the call site; `buildSystemPrompt` unchanged | a parameter, a branch and a test in `buildSystemPrompt`, every time | as chosen, plus naming a member nothing reads |
| States admitted / produced | `n` blocks in order / the same — the caller builds the array it means | 2 / 2 — honest, but only about marks | admits duplicate and empty names, produces neither |
| Second caller already in the codebase | the marks instruction today; R9 is a designed, documented next step that names it | — | same |
| What breaks for an implementor outside this repo | nothing — `buildSystemPrompt` is not published | — | — |

The third shape loses to the precedent note above: `refuseDuplicateNames` exists in `plugin.ts`
because a module's name keys its state, and nothing here is keyed by anything.

**Written contract?** Yes, and it is the point of the step: the blocks reach the model **after** the
override and in the order given, whatever the override returned. A signature cannot state "after",
so it is pinned by AC3 and AC4 rather than described in prose.

**Escalate?** No. One module, no new seam, no dependency, no published surface.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R19 | The slot names its role, not its occupant | `grep -rn "hasInlineMarks" src \| wc -l` | prints `0` |
| AC2 | R19 | The prompt builder no longer knows the wire format | `grep -c "wire/index.js" src/translation-providers/shared/buildSystemPrompt.ts` | no match |
| AC3 | — | The prompt sent for a marked document is byte-for-byte what it was | a test asserting **exact equality** with `` `${EXPECTED_EN_DE}\n\n${inlineMarksInstruction()}` `` | exit 0, the case runs |
| AC4 | R19 | More than one block is appended, in the order given, after an override that ignores `defaultPrompt` | a test passing two blocks and asserting the full string is `override + "\n\n" + first + "\n\n" + second` | exit 0, the case runs |
| AC5 | — | No blocks means no trailing separator | a test asserting exact equality with the plain default when the list is empty and when it is omitted | exit 0, both cases run |
| AC6 | — | Nothing already passing breaks | `bunx vitest run` | 210 files, no failures |
| AC7 | — | No new type errors in the package | `bun run check-types` | exit 0 |
| AC8 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC9 | — | Both apps still compile against the package | `bunx turbo run check-types --force` (repo root) | exit 0, 9/9 |
| AC10 | — | The real declaration build still passes | `bunx turbo run build --filter='./packages/payload-plugin-translator'` (repo root) | exit 0 |
| AC11 | — | The prompt still works through a real Payload boot | `bun run test:integration:sqlite` (from `apps/dev`, after AC10) | 62 files / 248 passed / 7 skipped |

AC3 is the criterion that makes this step safe to call a refactor. The existing tests assert the
marked prompt with `toContain`, which cannot see a changed separator, a lost blank line or a
reordering — exactly the ways a join can go wrong. AC11 matters for the same reason from the other
end: the sandbox's fake reads the target locale back out of the prompt text by regular expression
(`fakeAsk.ts`), so a malformed prompt fails there and nowhere else.

## Pre-flight

Run against the tree as steps 6 and 7 left it, before any criterion was written.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | the grep above | prints `7` | change — must fail now, and does |
| AC2 | the grep above | prints `1` | change — must fail now, and does |
| AC3 | `grep -c 'toBe(\`${EXPECTED_EN_DE}' src/translation-providers/shared/__tests__/buildSystemPrompt.test.ts` | no match | change — must fail now, and does |
| AC4 | `grep -c "alwaysAppend" src/translation-providers/shared/buildSystemPrompt.ts` | no match | change — must fail now, and does |
| AC6 | `bunx vitest run` | 210 files, 2564 passed, 9 skipped | invariant — passes now |
| AC7 | `bun run check-types` | exit 0 | invariant — passes now |

## Risk notes

- **A join is where a refactor leaks.** The old code appends one block with `\n\n`; a list joined
  carelessly produces a trailing separator when empty, or a single newline between members. AC3 and
  AC5 pin both ends with exact equality rather than containment.
- **The prompt is read by machine in two places.** `apps/dev`'s fake parses the target locale out of
  it, and `askOpenAI` refuses a `json_object` request whose prompt lacks the word `json`. Neither
  reads the appended region, but both read the whole string, which is why AC11 runs.
- **The default prompt text is pinned verbatim by an existing test**, because consumers extend that
  exact string through `defaultPrompt`. This step must not touch it, and AC3 reuses the same
  constant rather than restating it.
- **“Byte-for-byte identical” holds for type-legal inputs only.** A plain-JavaScript override
  returning `undefined` or `null` — which the `SystemPromptBuilder` type forbids — produced
  `undefined` or the literal string `"undefined\n\n…"` before, and produces `""` or `"\n\n…"` now,
  because `Array.prototype.join` renders both as the empty string. Found during review and left:
  the type owns the case, and of the two the new one is the lesser harm — the old one sent the word
  "undefined" to the model as prompt text.
- **One caller today.** The second is R9, which is designed and documented but not built. If R9 were
  abandoned, this step would leave a list with one member — a shape no worse than the boolean it
  replaced, and one fewer import.
