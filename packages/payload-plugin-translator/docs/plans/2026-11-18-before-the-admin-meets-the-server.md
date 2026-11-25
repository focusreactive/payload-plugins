# Before the admin meets the server

**Status:** preliminary plan · **Branch:** `feat/translator-admin-ui-on-stubs` · **Risk:** medium

The 1.0 admin is built and green against a stub. Joining it to a real server is slice 1 of the admin
research, defined in `2026-11-18-the-server-reads-the-state.md`. Writing that definition surfaced
four questions, and answering them changed what has to be built: one field leaves the contract, one
rule moves from the admin into the server, and a defect was found in how a failure reaches a person.

This file records those decisions and the order the work goes in. Each item is its own commit on
this branch; none of them merges before the stub is gone.

## What was established, and how

Not opinions — each was checked.

**Payload refuses a write that leaves a required localized field empty, and loses the whole write.**
Verified by `apps/dev/src/integration/translator/required-localized-partial-write.int.test.ts`, four
cases: the refusal names the field, nothing lands, the same write with the field travels fine, and a
second empty locale refuses the same way. The message is `The following field is invalid: Title`.

**Payload skips validation entirely on a draft write.**
`node_modules/payload/dist/collections/operations/utilities/update.js:191` —
`skipValidation: isSavingDraft && !hasDraftValidationEnabled(collectionConfig)`, with the comment
"only skip validation for drafts when draft validation is false".

**The plugin already writes a draft wherever the collection has them.**
`server/features/translate-document/targetLayer.ts:45-49`.

**A required localized field the plugin cannot translate can never be filled by any run.**
Translatable means `text`, `textarea` or `richText`, localized, and not excluded
(`core/domain/content-projection/translatableLeaf.ts:17-27`). A required localized `number`,
`select`, `date`, `relationship` or `upload` is outside that set, and so is a text field the host
excluded. No run fills it — not an automatic one, not "translate all", not a chosen subset.

**Auto-translate never looks at the target locale.** Its only reasons to stand down are the
plugin's own write, no resolvable source locale, an actor it cannot name, and a run already under
way (`server/modules/auto-translate/AutoTranslateEnqueue.hook.ts:49,60,85,98`). An empty target is
the ordinary first run, not an exception.

**Auto-translate still publishes.** `AutoTranslate.policy.ts:91-93` —
`resolvePublishOnTranslation` is `passesPublishGate`, so a published source publishes the
translation. Validation therefore runs on exactly the path nobody is watching.

## Decisions by the owner

- 2026-11-18 — decided by the owner: `mustInclude` leaves the contract. A lock on a checkbox cannot
  fill a required field the plugin does not translate, and it cannot see a host's own `validate`
  function, so it gives false confidence where it works least.
- 2026-11-18 — decided by the owner: where a collection has drafts, a translation writes a draft and
  never publishes; the person publishes. The flag that used to publish on translation has already
  left the admin.
- 2026-11-18 — decided by the owner: where a collection has no drafts, the translation goes into the
  live document, and the admin offers no field selection there — only the whole document. A partial
  write that Payload refuses costs the entire run, so the choice is withheld where the cost exists.
- 2026-11-18 — decided by the owner: a failure says what actually went wrong instead of a generic
  sentence. Recorded against the defect below, which has to be fixed for that to be possible.
- 2026-11-18 — decided by the owner: the `dismissed` flag leaves the read answer. The dismissal
  itself stays whole — the button, the route, the access action and the rebasing. Only the reported
  flag goes: after a rebase the leaves read `current` on their own, and the one sentence the flag
  would enable ("3 fields have drifted; you asked not to be reminded") needs the second fingerprint
  that was deliberately removed on 2026-10-24, because holding two made the button lie — the panel
  went quiet while a run narrowing by `stale` still overwrote the text the editor had kept.
- 2026-11-18 — decided by the owner: the panel's source locale is
  `policy.sourceLocale ?? localization.defaultLocale`, resolved as auto-translate already resolves
  it. The locale the admin is viewing stays what it already is — the **target**, in the field
  control (`TranslateFieldControl.tsx:113`) — and never becomes the panel's source: standing in a
  translated locale would then offer the original as a target to overwrite.
- 2026-11-18 — decided by the owner: a document that does not exist and one the caller may not read
  both answer `404`, told apart by nothing — the conflation `fetchSourceDocument` already makes.
- 2026-11-18 — recorded, not changed: auto-translate keeps publishing, as decided on 13 November.
  No admin rule reaches it, so the honest failure reason is the only thing that helps there.

## The defect this uncovered

A failed run stores a message that has already been collapsed.
`server/features/translate-document/wireTranslateRunner.ts:150`:

```ts
await settle("failed", toClientErrorMessage(messageOf(event.error)));
```

Outside `development` and `test`, `toClientErrorMessage` answers
`"Translation failed. See the server logs for details."` for any message not carrying one of the ten
catalogued reasons (`shared/http/toClientErrorMessage.ts:48-56`,
`core/errors/failureReason.ts:1-12`). A Payload validation message carries none, so that generic
sentence is what lands in `translator-runs.error` — not beside the real one, instead of it.

Two claims in that file's docblock (`:40-41`) are false as a result:

- *"The full error still lives in the run record"* — the run record holds the collapsed text.
- *"and server logs"* — nothing in this path logs. A search for `logger.error` across
  `features/translate-document/` and the Payload-jobs runner finds nothing.

The raw error reaches exactly one place: `notifier.failed(task, event.error)`, the host's own
callback. A host that registers none keeps nothing.

## Order of work

Each item is a commit. The first three are independent of the read model and can land first; items
4 and 5 shrink what the read model must answer, so they precede it.

1. **The failure reason survives the write.** Keep the raw message where a developer can reach it —
   the run record, a log line, or both — and correct the two false sentences in the docblock.
   Decides nothing about what a user sees.

2. **A refused target write gets its own reason.** Add it to the catalogue so production says
   something true rather than the generic sentence. Fixed text, no field names yet.

3. **Whether a reason may carry detail.** Today a reason is a bare marker and its text is a
   constant, so "the field Priority is required and is not translatable" cannot be said. Either the
   reason gains a payload or the honest text stays general. **Open — needs a decision.**

4. **`mustInclude` and `dismissed` leave the contract.** Both go from
   `types/wire/DocumentTranslationState.ts`. With them: the locked set and its seeding in
   `client/features/translate-fields/ui/TranslateFields.tsx` and
   `client/entities/translation/model/fieldSelection.ts`, the `content.dismissed` branch in
   `client/entities/translation/model/localeRow.ts:59`, and both values in the stub. The dismissal
   feature is untouched.

5. **Field selection follows the drafts layer.** Where a collection has no drafts the admin offers
   only the whole document, and the server refuses a filtered run into such a collection rather than
   trusting the screen. This replaces the narrower rule that only an empty locale withheld the
   choice.

6. **The read model**, in the four slices its own definition sets out: the document's shape; the
   per-leaf verdict; a locale's content; the two routes.

7. **Stub removal** — step 13 of the admin design. The gate is the `apps/dev` integration tests,
   which also need `callEndpoint` to carry a query string before `list-state` can be driven there.

## What this does not settle

- Whether `publish_on_translation` leaves the wire. The admin no longer sends it — no match in
  `src/client` — but `types/wire/ActionBodies.ts:18` and
  `server/features/enqueue-translation/model.ts:24` still accept it, so a host can still ask for a
  published translation. Keeping it is defensible; it just means "we always write a draft" describes
  the admin and not the plugin.
- What an editor does with five translated locales, each needing its own publish. Today's flag could
  do it in one go; this is a line for the migration notes rather than a defect.
- Whether a collection that turns on draft validation (`versions.drafts.validate`) deserves the same
  treatment as one with no drafts. It behaves the same way and nothing here covers it.
