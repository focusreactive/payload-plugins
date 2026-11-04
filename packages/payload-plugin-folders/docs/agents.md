# AI agents and the folders plugin

This page is for a host developer who lets an AI agent edit their CMS through
`@payloadcms/plugin-mcp`. It shows what an agent gets wrong today with only the stock MCP tools, and
proposes what the folders plugin should add so an agent moves, renames and creates content the way an
editor in the admin does: with every language in view, and with a confirmation before a live URL
changes.

Status: section 1 describes a trial that was run. The loud refusal on the stock `updateDocument`
(section 3, "The stock `updateDocument` path: refuse loudly") is built and tested. The rest of
sections 2 to 5 is a proposal: the five tools (`browseTree`, `createFolder`, `previewMove`,
`previewRename` and `applyTreeChange`), the options and the other hooks named there do not exist
yet. Paths are relative to this package unless they start with `node_modules/`, which means this
package's own `node_modules` (plugin-mcp 4.0.0-beta.5, payload 4.0.0-beta.5).

## 1. What the trial showed

Setup: the dev app with `FOLDERS_MCP=true` (`dev/mcpPluginOptions.ts`: find, create, update and delete
on `folders`, `pages` and `posts`, everything else off), `@payloadcms/plugin-mcp` 4.0.0-beta.5, two
locales (`en` default, `de`, fallback on), a seeded database. Each task ran as a fresh Claude Code
session on Sonnet (`claude -p --model sonnet`) with only the five MCP tools (`createDocuments`,
`deleteDocuments`, `findDocuments`, `updateDocument`, `getConfigInfo`), no other tools, no user
instructions, signed in through an API key as a user with the admin role. The prompts, verbatim:

1. "Using the Payload CMS tools, create a folder called Guides inside the Products folder."
2. "Using the Payload CMS tools, move the page Gift Cards into the Guides folder."
3. "Using the Payload CMS tools, rename the folder Company to Team."

No agent asked a question before a write. No agent passed a `locale` argument. No agent mentioned
redirects, German, or which live pages a change touches. No tool returned an error.

### Task 1: the folder was created in English only

Calls, in order:

- `getConfigInfo {}` returned `Collections: pages, posts, folders` and `Globals: none`.
- `findDocuments {"depth":1,"limit":100,"slug":"folders"}` returned 7 folders, each with one name and
  one path, for example `"name":"Products","slug":"products","fullPath":"/products"`.
- `createDocuments {"documents":[{"data":{"name":"Guides","parent":3,"slug":"guides"}}],"returning":true,"slug":"folders"}`
  returned the new folder: id 8, `"fullPath":"/products/guides"`, `"orderKey":"9w"`.

Result: the folder is in the right place with a valid English name and slug. Its German name and slug
are empty (`name {en: Guides, de: null}`), so the German URL `/produkte/guides` exists only through
fallback, and the German tree shows an English name.

Why: the agent never learned that the site has two languages. `getConfigInfo` lists slugs only
(`node_modules/@payloadcms/plugin-mcp/dist/mcp/builtin/getConfigInfoTool.js:11`). `findDocuments`
without `locale` reads the default locale, so every name came back as one plain string. The stock
descriptions are generic ("Find documents in any collection by passing the collection slug and
optional ID or where clause.", `node_modules/@payloadcms/plugin-mcp/dist/mcp/builtin/collections/findTool.js:5`)
and never mention locales. The plugin itself handles this case well in the admin: the create dialog
writes the name into the default locale and the viewed one in one request
(`src/admin/Create/localizedValues.ts:4-15`, README "Locales", lines 1108-1111). An agent has no such
path.

### Task 2: the agent reported a move that did not happen

Calls, in order:

- `getConfigInfo {}`.
- `findDocuments {"depth":1,"slug":"pages","where":{"title":{"equals":"Gift Cards"}}}` returned page 9,
  `"folder":{"id":3,...}`, `"fullPath":"/products/gift-cards"`, `"_status":"published"`.
- `findDocuments {"slug":"folders","where":{"name":{"equals":"Guides"}}}` returned id 8.
- `updateDocument {"data":{"folder":8},"id":9,"slug":"pages"}` returned
  `Document updated successfully in collection "pages"!` with `{"id":9}`, and no `isError`.

The agent's final answer: "I moved the Gift Cards page (ID 9) from the Products folder into the
Guides folder (ID 8). ... I didn't re-fetch the page to check that, so the update response is the
only confirmation."

Result: page 9 is still in folder 3, still at `/products/gift-cards` and `/produkte/gift-cards`. Only
`updatedBy` and `updatedAt` changed, on the main row and on the published version.

Why, in the order it happens:

1. The page's `folder` field has `access: { update: nobody }` (`src/fields/pageFields.ts:164-173`;
   `orderKey` and `structureRevision` the same, lines 174-191).
2. The MCP update runs with `overrideAccess: false`
   (`node_modules/@payloadcms/plugin-mcp/dist/mcp/builtin/collections/updateTool.js:45-61`), so
   Payload's field pass deletes the incoming `folder` and refills it with the stored value
   (`node_modules/payload/dist/fields/hooks/beforeValidate/promise.js:218-253`). Nothing is reported.
3. The plugin's structure guard then sees no change and writes the stored structure back anyway
   (`src/hooks/pages/structureGuard.ts:39-62`). Its loud refusal, "Use moveItems() to move content",
   fires only for a Local API call with `overrideAccess: true` at the current revision (lines 21-26
   and 55-57), never for an MCP request.
4. The update itself succeeds, so `updateDocument` reports success.

This silent drop is deliberate for the admin: a stale form, an autosave or a version restore must not
move a page back (README lines 390-394). For an agent it is the worst outcome, because the agent
cannot tell a dropped field from a saved one. A real move needs `POST /api/folders-tree/move`
(README line 791) or `moveItems()`, which change the URL in both languages, write redirects, and in
the admin first show "2 published URLs will change across 2 languages" with a box to redirect the old
URLs (README lines 1148-1151). None of that is reachable through the stock tools.

### Task 3: the label changed, the URL did not, and the agent offered more only afterwards

Calls, in order:

- `getConfigInfo {}`.
- `findDocuments {"slug":"folders","where":{"name":{"equals":"Company"}}}` returned id 2,
  `"name":"Company","slug":"company","fullPath":"/company"`.
- `updateDocument {"data":{"name":"Team"},"id":2,"returning":true,"slug":"folders"}` returned
  `Document updated successfully in collection "folders"!` with `"name":"Team","slug":"company"`.

The agent's final answer: "The folder's name is now "Team". Its slug (`company`) and `fullPath`
(`/company`) didn't change ... I can update both to `team` and `/team` if you want them to match, but
that would change the folder's path."

Result: the English name is Team, the German name is still Unternehmen, no URL changed.

What was missing: "rename" has two meanings here, the label or the URL, and the agent picked one
without asking. When it did raise the URL, it was after the write and in general terms. It did not
say that three live pages (About Us, Contact, Our Team) would change URL, that the plugin writes
redirects for them (README lines 885-891, and one mirror row per page, line 926), or that renaming
needs publish rights (README line 1408). It never saw the German name or slug, for the same reason as
task 1. Had it changed the slug through `updateDocument`, the plugin would have rewritten the URLs and
written redirects with no confirmation at all, because the confirmation lives in the admin dialog
(README lines 1170-1172), not on the server.

### The common cause

The stock tools are generic create, read, update and delete. They do not know that this site has a
tree, that structure changes only through a move, that a URL is per language, or that a URL change
should be confirmed. The plugin has all of that on the server (`planMove`, `moveItems`,
`planFolderEdit`, `checkSegment`, the access checks), but only the admin uses it.

## 2. The recommendation

Extend MCP from the folders plugin. Ship five tools, make the stock update tool refuse a structure
write loudly, rewrite the stock tool descriptions for folders and pages, and send a short set of MCP
server instructions. Ship no skill in the first version.

Why tools and not a skill:

- **Reach.** An agent that edits a CMS is often a chat app or a custom agent, not Claude Code. A skill
  helps only a client that loads skills, and only when the host installed it there. MCP tools reach
  every MCP client. A tool's name, description and input schema are the one text every client shows
  the model, so the rules that matter go there.
- **A rule in a prompt is not enforced.** Task 2 had no bad intent: the tool said "success". The rule
  "confirm before breaking live URLs" needs a server-side mechanism. Here it is a preview tool that
  returns a confirmation token, and an apply tool that refuses without a valid one. The token binds
  the exact change that was previewed, for the user who previewed it, for 15 minutes.
- **Locales need data, not advice.** The tools take and return one value per locale, and their input
  schemas list the site's locale codes, so the model sees `en` and `de` before its first call.
- **Access stays the plugin's.** Every tool runs as the API key's user and calls the same core
  functions the REST endpoints call, with `overrideAccess: false` (README lines 969-971). Move access,
  the publish question for a URL change (decision 23), the rule that a refused user learns nothing
  about other pages (decisions 37 and 39), and the stale check (decision 27) all apply unchanged. The
  tools add no access rules of their own.
- **The stock tools cannot be fixed by text alone.** plugin-mcp lets a host or plugin override a
  built-in's `description`, `access`, `annotations` and `overrideResponse`, but not its input or
  handler (`node_modules/@payloadcms/plugin-mcp/dist/types.d.ts:100-110`). The `afterToolCall` hook
  runs after the write. So a better description helps, but only a server-side refusal stops the
  silent drop.

Why no skill yet: MCP has a channel for the same text that reaches more clients, the server
`instructions` returned at connect time (`node_modules/@modelcontextprotocol/server/dist/createMcpHandler-DZmmlN8e.d.cts:2837-2839`).
plugin-mcp passes it through `mcp.serverOptions.options` (`node_modules/@payloadcms/plugin-mcp/dist/mcp/buildMcpServer.js:16-21`).
Claude Code puts server instructions into the model's context. A skill would repeat that text for one
client. Section 4 says when a skill would earn its place.

How the agent gets to ask the right question: each preview returns `askUser`, the questions an
editor would be asked in the admin, already worded with the numbers and example URLs. The apply tool
takes `confirmedSummary`, the preview's one-line summary, as an argument. A client that asks the user
before a tool call (Claude Code does, for a tool not on its allow list) then shows "2 published URLs
will change across 2 languages" in its approval prompt, so even a careless model puts the real
question in front of a person.

## 3. The tools

| Tool | Kind | Fixes |
|---|---|---|
| `browseTree` | read | Tasks 1 and 3: the agent never saw German names, slugs or paths, or which pages are live. |
| `createFolder` | write, no URL change | Task 1: the folder got an English name only. |
| `previewMove` | read | Task 2: there was no move path at all. |
| `previewRename` | read | Task 3: label or URL was never asked, and the cost of a URL change was never shown. |
| `applyTreeChange` | write | Tasks 2 and 3: a URL-changing write needs a previewed, confirmed change. |

All five are top-level plugin-mcp tools (`tools` in `MCPPluginConfig`,
`node_modules/@payloadcms/plugin-mcp/dist/types.d.ts:245-248`), each with `access: ({ req }) =>
Boolean(req.user)`. Each returns a short text block for the model and the same data as
`structuredContent`. A refusal returns `isError: true` with the plugin's own message.

### `browseTree`

- **Input:** `folder` (an id, or `null` for the top level, default `null`), optional `search` (text),
  optional `collection`.
- **Returns:** `locales` and `defaultLocale`; the folder's ancestors; and up to 50 rows, each with
  `collection`, `id`, `kind` (`folder` or `page`), `name` or `title` per locale, `slug` per locale,
  `fullPath` per locale, `status` per locale (`published`, `draft`, or `fallback` when the locale is
  live only through the default one, README line 1112), `isFolderRoot`, and for a folder its child
  count. A value the locale does not have of its own is marked as fallback, as the admin's fallback
  chip does (README line 1109).
- **Calls:** `getChildren` (`src/core/treeChildren.ts:227`) once per locale, merged by id;
  `searchTree` (`src/core/treeSearch.ts:409`) when `search` is set; `getAncestors`
  (`src/core/treeAncestors.ts`). These read each collection through its own `read` access (README
  lines 1288-1289), so a document the user cannot read is not listed.
- **Why:** in all three tasks the agent worked from default-locale strings. In task 3 it never saw
  "Unternehmen" or that three pages under Company are live.

### `createFolder`

- **Input:** `parent` (id or `null`), `name` as an object with one key per site locale, where the
  default locale is required (`{ "en": "Guides", "de": "Ratgeber" }`), optional `slug` per locale
  (default: the plugin slugifies the name, `src/hooks/folders/beforeValidate.ts:24-35`).
- **Returns:** the new folder's `id`, `fullPath` per locale, and `fallingBack`, the locales that got
  no name of their own, with the path each one gets through fallback.
- **Calls:** `checkSegment` (`src/core/checkSegment.ts:27`) per locale first, so a taken path is
  refused with the plugin's message before any write. Then one
  `payload.create({ collection: <folders slug>, locale: "all", data: { name, slug, parent }, overrideAccess: false, req })`,
  the same single all-locale write the admin's create dialog makes, so the folder is whole or not made
  (`src/admin/Create/localizedValues.ts:9-10`).
- **Why:** task 1. The description tells the model to ask for a name in each language, or to say that
  the others will fall back. A new folder changes no live URL, so it needs no token.

### `previewMove`

- **Input:** `items` (a list of `{ collection, id }`), and either `toFolder` (id or `null`) with an
  optional `position` (`start` or `end`), or `after` (`{ collection, id }`); `redirects` (default
  true).
- **Returns**, for the task 2 move (illustrative):

```json
{
  "ok": true,
  "summary": "2 published URLs will change across 2 languages. The old URLs will redirect to the new ones.",
  "needsConfirmation": true,
  "publishedUrlChanges": { "total": 2, "byLocale": { "en": 1, "de": 1 } },
  "draftOnlyPages": 0,
  "examples": [
    { "locale": "en", "from": "/products/gift-cards", "to": "/products/guides/gift-cards" },
    { "locale": "de", "from": "/produkte/gift-cards", "to": "/produkte/guides/gift-cards" }
  ],
  "redirects": { "enabled": true, "rowsToWrite": 2, "redirectsPluginRows": 2 },
  "askUser": [
    "Moving Gift Cards into Products > Guides changes its live URL in English and German. Go ahead?",
    "Redirect the old URLs to the new ones? (recommended)"
  ],
  "confirmationToken": "<opaque>",
  "expiresInSeconds": 900
}
```

  A blocked move returns `ok: false` and `blocked` (the plugin's messages, such as "This part of the
  tree changed. Reload and try again." or a path conflict), and no token. `needsConfirmation` is true
  when any published URL changes in any locale; a reorder inside one folder, or a move of draft-only
  pages, returns `false` and still a token.
- **Calls:** `planMove(req, request, { overrideAccess: false })` (`src/core/move.ts:1180-1185`), the
  function behind `POST /folders-tree/move/preview`. The per-locale counts and up to 3 examples per
  locale come from the plan's path changes (`summarizePageChanges`, `src/core/move.ts:223`); the
  stock `MovePreview` has 5 samples in total and no per-locale count (`src/core/move.ts:108-138`).
  The token also records each item's current folder and order key as `expected`, so the apply is
  refused as stale if the item moved in between (decision 27, README lines 1155-1156).
- **Why:** task 2. The description says: "This is the only way to move a page or folder.
  `updateDocument` cannot change `folder` or `parent`."

### `previewRename`

- **Input:** `folder` (id), optional `name` per locale, optional `slug` per locale. A parent change is
  refused here with "Use previewMove", as `planFolderEdit` refuses a move and a rename in one edit
  (`src/core/folderPreview.ts:96-105`).
- **Returns:** the folder's current `name`, `slug` and `fullPath` per locale; then `asked`, the change
  as requested, with `summary`, `needsConfirmation` and a token; then, when `name` was given without
  `slug`, `alsoChangeUrl`, the same rename with the slugified name as the new slug in the same
  locales, with its own counts, examples, summary and token. For task 3 (illustrative):

```json
{
  "folder": {
    "id": 2,
    "name": { "en": "Company", "de": "Unternehmen" },
    "slug": { "en": "company", "de": "unternehmen" },
    "fullPath": { "en": "/company", "de": "/unternehmen" }
  },
  "asked": {
    "summary": "Only the English name becomes Team. No URL changes.",
    "needsConfirmation": false,
    "confirmationToken": "<opaque A>"
  },
  "alsoChangeUrl": {
    "slug": { "en": "team" },
    "summary": "3 published URLs will change in English. The old URLs will redirect to the new ones.",
    "examples": [
      { "locale": "en", "from": "/company", "to": "/team" },
      { "locale": "en", "from": "/company/contact", "to": "/team/contact" },
      { "locale": "en", "from": "/company/our-team", "to": "/team/our-team" }
    ],
    "needsConfirmation": true,
    "confirmationToken": "<opaque B>"
  },
  "askUser": [
    "Change only the name, or the English URL too (/company becomes /team for 3 live pages)?",
    "The German name stays Unternehmen and the German URLs stay /unternehmen. Rename those too?"
  ]
}
```

- **Calls:** `planFolderEdit(req, edit, { overrideAccess: false })` (`src/core/folderPreview.ts:69`),
  the function behind `POST /folders-tree/folders/:id/preview`. It asks the folder's `update` access
  and, when live URLs change, the publish question for the pages beneath (decision 23,
  `src/core/folderPreview.ts:187-202`), and names a conflicting page only to a reader who may read
  it (`createConflictNamer`, `src/core/uniqueness.ts:327`). One change to the core is needed:
  `FolderEdit` takes one `locale` and one `slug` (`src/core/folderPreview.ts:29-38`, the write key at
  line 136-137), and a rename of `en` and `de` together must be planned as one edit, not two previews
  added up, because a default-locale change also moves the locales that fall back to it (README lines
  1104-1106). `slug` becomes a per-locale map; the single-locale form stays for the REST endpoint.
- **Why:** task 3. The model gets both meanings of "rename" with their costs, and the German side, in
  one call, and the user picks.

### `applyTreeChange`

- **Input:** `confirmationToken`; `confirmedSummary`, which must equal the preview's `summary` when
  `needsConfirmation` was true.
- **What it does:**
  1. Checks the token: its signature, that it belongs to `req.user`, that it has not expired.
  2. Takes the tree lock (`withTreeLock`, `src/core/treeLock.ts:495`), plans the change again, and
     compares it with the token's digest (the counts and the list of published URL changes). If they
     differ, nothing is written and the answer is the new summary with "The tree changed since the
     preview. Preview again and confirm with the user."
  3. A move: `applyMove(req, request, { overrideAccess: false })` (`src/core/applyMove.ts:136`), with
     the `expected` state from the preview. A rename: one
     `payload.update({ collection: <folders slug>, id, locale: "all", data: { name, slug }, overrideAccess: false, req, context })`
     inside the same lock, with `context.foldersRedirects` set from the preview's `redirects` choice
     (README lines 902-904) and a marker that lets the write past the guard below. The plugin's own
     save hook asks the publish question again (`src/hooks/folders/renamePublishRights.ts:33`).
  4. When the redirects-plugin mirror was queued as a batch (more than `limits.maxSyncDocuments`
     rows, default 200, README lines 938-943), it steps the batch itself for up to about 20 seconds,
     because an MCP caller has no admin open to step it. Whatever is left is reported with its
     operation id.
- **Returns:** `done: true`, the item's new `fullPath` per locale read back after the write, the
  published URL changes per locale, the redirect rows written, and any mirror batch still running.
  Reading the result back is what the task 2 agent said it had not done.
- **Why:** tasks 2 and 3. It is the single write path for any change that can break a live URL, and
  it cannot run without a preview.

### The confirmation token

Stateless, so it works on serverless and across instances: base64url of a JSON body plus an
HMAC-SHA256 signature keyed from `payload.secret`. The body holds a version, the kind (`move` or
`rename`), the normalized request, the user's collection and id, the plan digest, and the expiry. A
move is capped at `limits.maxItemsPerMove` items (default 500), which bounds its size. Replaying a
used token fails on step 2, because the re-plan no longer matches.

This proves that the model saw the preview, not that a human approved it. Only the client can ask the
human. That is why the summary travels in the apply call's arguments, where an approval prompt shows
it. MCP's newer answer is elicitation, see section 6.

### The stock `updateDocument` path: refuse loudly

Pick: the folders plugin adds a `beforeOperation` hook on the page collections and on folders that
refuses, with a 400, an update that comes through MCP and names a structure value different from the
stored one. The same hook refuses a deliberate edit from any other caller whose field access would
drop the value (see "The same hook for every other caller" below). Through MCP the fields are:

- pages: `folder`, `orderKey`, `structureRevision`;
- folders: `parent`, `orderKey`, `structureRevision`, and `slug`. Any slug change is refused, not
  only one that alters a live URL, because telling them apart would mean planning the rename inside
  the hook, and `previewRename` answers a draft-only rename with `needsConfirmation: false` anyway.
  A name-only change passes: it changes no URL.

Decided (review finding P-36, a ruling reversible by the session owner): the folder slug refusal
stays until the plugin's own agent tools with a preview exist. The spec allows a folder slug change
through a normal update and runs the subtree rewrite, and a REST `PATCH` still does exactly that.
MCP is held to a stricter rule because of who is on the other end. A person saving in the admin sees
the rename dialog first, with the live URLs that change and the redirect checkbox, and a developer
who writes a REST script chose the rename in code. An agent calling `updateDocument` sees neither:
the stock tool answers `Document updated successfully` and nothing else, so the agent cannot tell
the user how many live pages changed URL, in which languages, or that redirects were written. Task 3
above shows the same agent offering the slug change in general terms, after the write. A slug
change passed through would be a rename with no preview and no confirmation. Once `previewRename`
and `applyTreeChange` are built, the refusal message names them, and the agent gets the preview it
needs to ask first; whether the stock tool then accepts a slug change again is decided at that point.

The message says what to do instead. The built message for a page move is: `"folder" cannot be
changed through MCP updateDocument. Moving a page changes its live URL in every language, so it goes
through the folder tree in the admin, POST /api/folders-tree/move (preview it with POST
/api/folders-tree/move/preview) or moveItems(), which show the URL changes and write redirects.
Nothing was saved.` It names only what exists today. The tool names `previewMove` and
`applyTreeChange` come into the message when the tools are built. The refusal is an `APIError` 400
with `data.reason` set to `mcp-structure-change` or, for a folder slug, `mcp-slug-change`
(`src/hooks/mcpStructureGuard.ts`). plugin-mcp turns the thrown error into `Error updating document in
collection "pages": <message>` with `isError: true`
(`node_modules/@payloadcms/plugin-mcp/dist/mcp/builtin/formatEntityError.js:3-14`), so the model sees
it and has its next step.

How the hook knows: the MCP endpoint sets `req.payloadAPI = "MCP"`
(`node_modules/@payloadcms/plugin-mcp/dist/endpoint/index.js:10`), the update tool passes that `req`
into `payload.update` (`updateTool.js:61`), and the Local API keeps an existing `payloadAPI`
(`node_modules/payload/dist/utilities/createPayloadRequest.js:87`). It runs before field access, which
is where the value is lost today. The pattern is the one `bulkUpdateGuard` already uses
(`src/hooks/pages/bulkUpdateGuard.ts`).

The same hook for every other caller (review finding P-02): the loud refusal is not limited to MCP,
because a REST `PATCH /api/pages/5 {"folder": 9}`, a GraphQL `updatePage`, a host's own MCP tool or a
Local API call with `overrideAccess: false` hit the same silent drop and the caller reports a move
that never happened. The hook runs for every request that is not internal (`isInternalWrite`) and
whose `overrideAccess` is not `true`, which is exactly the set for which field access strips the
value. For these callers the rule is the one `beforeChange` applies to a value that reaches it
(`classifyStructureEdit`, `src/core/structureGuard.ts`): a different `folder` (page) or `parent`
(folder), or a different `orderKey`, is a deliberate edit and is refused when it carries no
`structureRevision` or one that is not older than the stored one. A missing revision is a deliberate
edit here, never stale, because a script sends none while the admin never omits it: the edit form,
its autosave and the folder form all post the stored `folder` or `parent`, `orderKey` and
`structureRevision` (recorded in `tests/e2e/admin-structure-replay.e2e.spec.ts`), and the plugin's
own partial saves (create dialogs, settings drawers, Set as root page, publish, trash) send no
structure at all. An older revision stays a silent replace, so a form loaded before a move in another
tab cannot be refused, and a `null` revision counts as 0, the stored value of a page from before the
plugin. `structureRevision` alone is not refused for these callers (it changes no place in the tree),
and a folder `slug` change is never refused for them: the MCP-only slug refusal above stands. The
Local API with `overrideAccess: true` is a host's server code, trusted to know what it does; its
structure values reach `beforeChange`, which keeps its own rule. The refusal reuses the MCP message
table with the channel phrase "by updating the document" in place of "through MCP updateDocument",
and the same `data.reason` values.

Why not the alternatives:

- **Hide `folder`, `orderKey` and `structureRevision` from the stock tools' input.** plugin-mcp has no
  way to change a built-in's input (`types.d.ts:100-110`, `handler?: never`, no `input` key), and
  `updateDocument` takes `data` as a generic object, checked only as a partial document
  (`updateTool.js:29-36`). Hiding them would mean replacing the tool, and then the plugin owns a copy
  of plugin-mcp's update code.
- **Refuse for every request, not only MCP.** The admin's full edit form and an autosave send the
  stored `folder` back, and after a move in another tab they send the old one. That must keep being
  replaced quietly (`src/hooks/pages/structureGuard.ts:15-31`). An agent's write has no such stale
  source, and a stale agent write is still better refused than dropped.
- **Rewrite the response in `afterToolCall`.** It runs after the write, so other fields in the same
  call would already be saved, and the model would be told after the fact.

A same-value write passes, so an agent that copies a whole document back does not trip the guard.
A folder slug read through the fallback locale and sent back unchanged passes too, and the guard
leaves it out of the update, so the locale keeps falling back instead of storing the default
locale's slug as its own. plugin-mcp's own
input check accepts only a string for `slug`, so a `locale: "all"` slug object cannot reach the hook
through the stock tool in 4.0.0-beta.5; the hook compares it per locale all the same.
On pages, a `where` update that names these fields is already refused by `bulkUpdateGuard`
(`src/hooks/pages/bulkUpdateGuard.ts:7`). On folders the existing bulk guard covers `slug` but not
`parent` (`src/hooks/folders/bulkUpdateGuard.ts:6`), so the new hook handles `where` updates on
folders too.

### Stock tool descriptions and plugin collections

- The folders plugin sets the `description` of the stock `updateDocument`, `createDocuments` and
  `findDocuments` on folders and every page collection: what a folder is, that `folder` and `parent`
  change only through `previewMove`, that a slug change of a folder goes through `previewRename`, and
  that `locale: "all"` returns every language. plugin-mcp registers one MCP tool per wire name and
  takes its description from the first collection that has it
  (`node_modules/@payloadcms/plugin-mcp/dist/mcp/buildMcpServer.js:94-115`), so the text is written
  for all collections at once and set on every one of them.
- It switches the stock tools off on `folder-redirects`, `folder-operations` and the
  `folders-tree-state` global, which plugin-mcp otherwise exposes by default because the folders
  plugin adds them before plugin-mcp runs (`node_modules/@payloadcms/plugin-mcp/dist/mcp/sanitizeMCPConfig.js:13-24`,
  `84-125`). Access already protects them; switching them off removes noise from the tool list. A
  value the host set for these collections wins.
- It appends about 20 lines to the server `instructions`: the tree model in one paragraph, the
  preview then confirm then apply rule, "ask for every language, or say the others fall back", and
  "after a write, report the new URLs from the result, not from memory".

## 4. The skill

Not in the first version, for the reasons in section 2: the server instructions carry the same text
to more clients, and the token enforces the rule that matters.

A skill would earn its place for a different reader: a developer in the host's repository who writes
code against the Local API (`moveItems`, `planMove`, `planFolderEdit`, `checkSegment`, `findRedirect`
from `@focus-reactive/payload-plugin-folders/server`) and asks Claude Code for help. If that is
wanted later, it lives at `skills/payload-folders/SKILL.md` in this package, so it ships in the
tarball, and has four sections:

- **The model**: a page's URL is its folders' slugs plus its own, per locale; structure changes only
  through a move.
- **Writes**: which helper to call for a move, a rename, a publish, a delete; what `overrideAccess`
  does; pass `req` to nested calls (README lines 1378-1383).
- **Locales**: per-locale segments, fallback, `locale: "all"` writes.
- **Redirects**: what each write records, `findRedirect`, the mirror.

The server instructions and the skill should be built from one source string so they cannot drift.

## 5. How a host turns it on

Register both plugins, give the agent's user an API key, and keep the stock tools off on collections
the agent should not touch. The folders plugin finds plugin-mcp in the config and adds its tools,
descriptions and instructions to plugin-mcp's options itself. This config compiles today against
payload 4.0.0-beta.5 and plugin-mcp 4.0.0-beta.5; the folders plugin's `mcp` option, which this page
proposes, is not in it.

```ts
import { foldersPlugin } from "@focus-reactive/payload-plugin-folders";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import { buildConfig } from "payload";
import type { CollectionConfig } from "payload";

const Users: CollectionConfig = {
  slug: "users",
  // plugin-mcp signs an agent in as a normal Payload user; an API key needs this.
  auth: { useAPIKey: true },
  fields: [{ name: "role", type: "text" }],
};

const Pages: CollectionConfig = {
  slug: "pages",
  fields: [{ name: "title", type: "text" }],
  versions: { drafts: true },
};

export default buildConfig({
  admin: { user: "users" },
  collections: [Pages, Users],
  db: sqliteAdapter({ client: { url: "file:./cms.db" }, transactionOptions: {} }),
  localization: { defaultLocale: "en", fallback: true, locales: ["en", "de"] },
  plugins: [
    foldersPlugin({
      collections: { pages: true },
    }),
    mcpPlugin({
      collections: {
        users: {
          tools: {
            count: false,
            create: false,
            delete: false,
            find: false,
            findDistinct: false,
            getCollectionSchema: false,
            update: false,
          },
        },
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET ?? "",
});
```

The agent's client then connects to `POST /api/mcp` with the header
`Authorization: users API-Key <key>` (not `Bearer`).

The proposed folders option:

- `mcp` absent: the tools, descriptions and instructions are added when plugin-mcp is registered,
  and nothing happens when it is not.
- `mcp: false`: nothing is added. The loud refusal on `updateDocument` stays, because it protects
  data, not the tool list.
- `mcp: { tools: { createFolder: false } }`: leaves one tool out. `mcp: { instructions: false }`:
  sends no server instructions.

How the folders plugin reaches plugin-mcp's options: Payload 4 hands every plugin a map of the other
plugins, typed by slug (`node_modules/payload/dist/config/types.d.ts:167-177`, marked experimental),
and a plugin made with `definePlugin` reads its options when it runs, "so other plugins can edit or
replace it, even when the plugin was registered without options"
(`node_modules/payload/dist/config/definePlugin.js:13-20`). Plugins run in ascending `order`
(`node_modules/payload/dist/config/build.js:9-15`); plugin-mcp has order 10
(`node_modules/@payloadcms/plugin-mcp/dist/index.js:5-7`) and the folders plugin has the default 0, so
the folders plugin runs first and replaces `plugins["@payloadcms/plugin-mcp"].options` with a merged
copy. The host's own entries win on every key. plugin-mcp's package augments that map with its
options type (`node_modules/@payloadcms/plugin-mcp/dist/index.d.ts:2-10`). This path is read from the
source and not yet run; the build plan tests it first.

## 6. Limits and open points

- **Elicitation would be the real confirmation.** MCP's 2026-07-28 protocol lets a tool return an
  `input_required` result that the client turns into a question to the user, statelessly
  (`createMcpHandler-DZmmlN8e.d.cts:683-690`; the older push-style `elicitInput` throws on
  2026-era requests, lines 2232-2240). plugin-mcp's handler result type has no slot for it
  (`node_modules/@payloadcms/plugin-mcp/dist/types.d.ts:14-22`), and client support is unknown. When
  both exist, `applyTreeChange` can ask the user itself and the token stays as the integrity check.
- **The token cannot prove a human said yes.** A model can copy the summary into the apply call
  without asking. The client's approval prompt is the human gate, and some clients auto-approve.
  Hosts that need a hard gate should keep `applyTreeChange` off the client's allow list.
- **Page slug edits are not covered.** Changing a page's own slug through `updateDocument` still
  works and, on publish, changes its URL and writes a redirect with no preview. A `previewPageEdit`
  could follow the same pattern; it was not part of the trial.
- **`updateDocument` publishes by default.** Its `draft` argument defaults to false, so an agent's
  edit of a page writes the published version: in task 2 the published row's `updatedBy` changed. The
  stock description should say so; whether the folders plugin should do more is the host's call.
- **Delete, duplicate and publish of a selection** have their own previews in the plugin (`delete/preview`,
  decision 32) and are left out to keep the set small. The stock `deleteDocuments` refuses a
  non-empty folder already (README line 1189).
- **Tool names share one namespace** with the host's own tools and other plugins' tools. A host tool
  with the same key wins.
- **The trial was three tasks, one model, one run each.** It shows the failure modes, not their
  rates. The build plan re-runs the same three prompts after the change.
