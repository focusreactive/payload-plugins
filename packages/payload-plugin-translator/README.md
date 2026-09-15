<div align="center">

# Payload Translator

**Translate localized [Payload CMS](https://payloadcms.com/) content with an AI provider, without leaving the admin panel**

Pick a source locale and one or more targets; a background job fills in every localized text, textarea and rich-text field.

<p align="center">
  <a href="https://www.npmjs.com/package/@focus-reactive/payload-plugin-translator"><img src="https://img.shields.io/npm/v/@focus-reactive/payload-plugin-translator?style=flat&labelColor=000000&color=000000" alt="npm version" /></a>
  <a href="https://github.com/focusreactive/payload-plugins/blob/main/packages/payload-plugin-translator/LICENSE"><img src="https://img.shields.io/badge/license-MIT-000000?style=flat&labelColor=000000" alt="MIT license" /></a>
</p>

</div>

Payload localizes your content but does not translate it — an editor still copies text between locales by hand. This plugin closes that gap: every localized field gets translated, however deeply it sits inside groups, arrays, blocks and tabs, by a translation service you choose.

## Install

```bash
npm install @focus-reactive/payload-plugin-translator openai
```

`openai` is optional — it backs the recipe below, and any OpenAI-compatible endpoint works in its place.

| Requirement | Version |
| --- | --- |
| `payload` | `^3.76.0` |
| `@payloadcms/ui` | `^3.76.0` |
| `@payloadcms/richtext-lexical` | `^3.76.0` |
| `react` | `^19` — the plugin accepts `^18` too, but current `@payloadcms/ui` and `@payloadcms/richtext-lexical` builds require 19 |
| `openai` | `^4.50.0` (optional) |

Your Payload config must have [localization](https://payloadcms.com/docs/configuration/localization) enabled, and the fields you want translated must be marked `localized: true`.

> [!NOTE]
> Still on `0.x`: contracts change between minor releases, and the next major removes a good deal — never without deprecating it first. [Versioning](#versioning) has the terms and the list of what is already going.

## Quickstart

Hand the plugin the same collection objects you pass to `buildConfig`, not the sanitized ones from `payload.collections`. The originals still carry `localized: true` on nested fields.

This is a whole config so that it runs as shown; in your project keep your own database adapter, and set `PAYLOAD_SECRET` in the environment before starting.

```ts
// payload.config.ts
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import OpenAI from 'openai'
import { buildConfig } from 'payload'
import type { CollectionConfig } from 'payload'
import {
  createPayloadJobsRunner,
  createTranslationProvider,
  openAIComplete,
  translatorPlugin,
} from '@focus-reactive/payload-plugin-translator'

const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    { name: 'title', type: 'text', localized: true },
    { name: 'summary', type: 'textarea', localized: true },
  ],
}

export default buildConfig({
  collections: [Posts],
  db: sqliteAdapter({ client: { url: 'file:./payload.db' } }),
  localization: { defaultLocale: 'en', locales: ['en', 'de', 'fr'] },
  secret: process.env.PAYLOAD_SECRET ?? '',
  plugins: [
    translatorPlugin({
      collections: [Posts],
      translationProvider: createTranslationProvider({
        complete: openAIComplete({
          client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
          model: 'gpt-5.4-mini',
        }),
      }),
      runner: createPayloadJobsRunner(),
    }),
  ],
})
```

Regenerate the admin import map so Payload picks up the plugin's components:

```bash
npx payload generate:importmap
```

Open a `posts` document. A Translate control now sits beside the document controls: choose `en` as the source and `de` as the target, and the German locale is filled in within a minute.

> [!TIP]
> Rerun `payload generate:importmap` after adding or removing `documentLevel()` or `collectionLevel()`, or the admin renders without their controls. `fieldLevel()` adds no admin component, so it needs no regeneration.

## What you can do

- **Translate one document** — the control on the edit view queues a job for the target locale you pick, choosing a strategy and whether to publish the locale once it is filled in.
- **Translate a whole collection** — a dashboard above the list view runs the selected documents, or all of them, and reports progress per locale.
- **Translate into several locales at once** — `targetSelection: 'multi'` turns the target field on both the document and the collection surfaces into a multi-select, and every selected document is translated into every locale you picked. The default is one locale per run.
- **Translate a single field** — a control on the field itself, answering in place without queueing anything. Needs both `fieldLevel()` in `levels` and `withFieldTranslation` on the field.
- **Auto-translate on save** — wrap a collection in `withAutoTranslate(collection, { targets })` and editing the source locale queues its own translations, with no one pressing anything. On a collection with drafts enabled it waits until the document is published; without drafts it fires on every save. Rapid edits are coalesced into one run.
- **Protect hand-written copy** — the `skip_existing` strategy fills only empty target fields, and `withFieldTranslation(field, { exclude: true })` keeps a field out of translation entirely.
- **Steer how it translates** — `systemPrompt` replaces the instruction sent with every request, so tone, register, a glossary, or brand names that must stay untranslated are yours to set.
- **Bring any translation service** — an OpenAI-compatible adapter ships in the box; anything else is a single function you write, which receives the text and returns the reply. You do not parse it or check it back — that is the plugin's job.
- **Run it in the background or inline** — Payload Jobs by default, so an editor is not left waiting and a run can be cancelled or retried. `createSyncRunner()` translates inline instead, for tests and scripts.
- **Keep rich text intact** — the structure of a rich-text field survives translation, and so do block types. Blocks and array items keep their ids too, except inside a `localized` container, where each locale owns its own rows and gets fresh ones.
- **Spot stale translations** — with `provenance` on, the admin flags the locales whose source has changed since they were translated, and an editor can dismiss a flag without re-translating.

**What travels:** localized `text`, `textarea` and `richText` fields, at any depth inside groups, arrays, tabs and blocks. Every other field type reaches the target locale unchanged.

> [!NOTE]
> Inside a rich-text paragraph, word order follows the source language and inline emphasis can land on the wrong word once the target language reorders the sentence. [Container mode](#experimental-rich-text-one-container-at-a-time), available since `0.13.0` behind an opt-in flag, fixes both.

> [!IMPORTANT]
> Mark each **leaf** field `localized: true` yourself. Payload lets a wrapper (group, array, blocks, tabs) carry `localized` and have nested fields inherit it, and a leaf without it of its own is left alone.
>
> ```ts
> // Skipped — the nested title is not explicitly localized
> { name: 'meta', type: 'group', localized: true, fields: [{ name: 'title', type: 'text' }] }
>
> // Translated
> { name: 'meta', type: 'group', localized: true, fields: [{ name: 'title', type: 'text', localized: true }] }
> ```

## Contents

- [Install](#install)
- [Quickstart](#quickstart)
- [What you can do](#what-you-can-do)
- [Configuration](#configuration)
- [Drafts and publishing](#drafts-and-publishing)
- [Translation providers](#translation-providers)
- [Task runners](#task-runners)
- [Access control](#access-control)
- [Lifecycle callbacks](#lifecycle-callbacks)
- [Provenance and staleness](#provenance-and-staleness)
- [HTTP endpoints you can call](#http-endpoints-you-can-call)
- [Exports reference](#exports-reference)
- [Experimental: rich text one container at a time](#experimental-rich-text-one-container-at-a-time)
- [Versioning](#versioning)
- [Deprecated aliases](#deprecated-aliases)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Configuration

```
translatorPlugin(config: TranslatorPluginConfig)
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `collections` | `CollectionConfig[]` | — | **Required.** Original collection configs to make translatable. |
| `translationProvider` | `TranslationProvider` | — | **Required.** What actually translates the text. |
| `runner` | `TaskRunnerProvider` | — | **Required.** What runs the translation — in the background, or inline. |
| `levels` | `TranslationLevel[]` | `[documentLevel(), collectionLevel()]` | Which translation surfaces to enable. |
| `access` | `AccessGuard` | — | Gate for every translation endpoint. Omit to leave them open. |
| `basePath` | `string` | `'/translate'` | Base path for the plugin's endpoints. |
| `targetSelection` | `'single' \| 'multi'` | `'single'` | `'multi'` lets an editor pick several target locales for one run. _Since v0.10.0._ |
| `provenance` | `boolean \| { slug?: string }` | `false` | Adds a collection recording what each locale was translated from, so the admin can flag stale ones. Default slug `translator-provenance`. |
| `lifecycle` | `TranslationLifecycleCallbacks` | `{}` | Server-side `onQueued` / `onCompleted` / `onFailed` callbacks. |

### Translation levels

_Since v0.5.0; `fieldLevel()` since v0.6.0._

Levels are the surfaces the plugin adds. List the ones you want; each should appear at most once.

| Level | What it adds |
| --- | --- |
| `documentLevel()` | A Translate popup on the document edit view. |
| `collectionLevel()` | A bulk translation dashboard above the list table. |
| `fieldLevel()` | Turns on the per-field control. Not in the default set. |

```ts
import { documentLevel, collectionLevel, fieldLevel } from '@focus-reactive/payload-plugin-translator'

translatorPlugin({
  collections: [Posts],
  translationProvider,
  runner,
  levels: [documentLevel(), collectionLevel(), fieldLevel()],
})
```

`fieldLevel()` on its own shows nothing: the control appears only on the fields you wrap with `withFieldTranslation`.

### Per-field control and exclusion

```ts
import { withFieldTranslation } from '@focus-reactive/payload-plugin-translator'

export const Posts: CollectionConfig = {
  slug: 'posts',
  fields: [
    // A Translate control appears above this input (text, textarea, richText)
    withFieldTranslation({ name: 'title', type: 'text', localized: true }),

    // Never sent to the translation provider (any field type)
    withFieldTranslation({ name: 'sku', type: 'text', localized: true }, { exclude: true }),
  ],
}
```

The control translates from a source locale you pick, reading the **saved** document's value in that locale and writing the result into the locale you are editing. Unsaved edits in the form are invisible to it.

The control is an icon button above the input. It opens a small popup showing the direction — a source-locale select, an arrow, then the locale you are editing as the fixed target (`en → fr`). You choose the source; the target is always where you stand. Note this is the opposite direction from the document and collection controls, which translate *out of* the locale you are in.

The control needs a saved document, so it stays hidden while you are creating one. The result lands in the form unsaved — no save, no queue — and an Undo restores the previous value.

`withFieldTranslation` accepts `text`, `textarea` and `richText`; any other type is a compile error, so pass `{ exclude: true }` for those. Fields inside blocks are supported.

> [!WARNING]
> **A localized `blocks` or `array` container has no per-field translation.** Wrap the leaves, not the container. When the container itself is localized, each locale holds its own order and content, so there is no single field to translate across them: the control answers with a notice telling you to translate the whole document instead, which handles this case.

`{ exclude: true }` means *never send this field to the provider* — not *leave it untouched*. An excluded field keeps its target value when it has one, is filled from the source locale when the target is empty (so a required field does not fail validation on save), and is never sent for translation. Exclusion wins over the `overwrite` strategy.

### Auto-translate on source change

_Since v0.9.0._

Wrap a collection and edits to the source locale queue their own translations. On a collection with `versions.drafts` enabled this waits until the document is published; without drafts every save triggers it. Off unless you opt in, and a save that touched no translatable content queues nothing.

```ts
import { withAutoTranslate } from '@focus-reactive/payload-plugin-translator'

translatorPlugin({
  collections: [withAutoTranslate(Articles, { targets: ['de', 'fr'], debounceMs: 2000 })],
  translationProvider,
  runner,
})
```

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `targets` | `string[]` | — | **Required.** Locales to translate into. The source locale is always excluded. |
| `strategy` | `'overwrite' \| 'skip_existing'` | `'overwrite'` | Replace every target field, or only fill empty ones. |
| `debounceMs` | `number` | `0` | Delay before the queued job runs, coalescing rapid edits. |
| `sourceLocale` | `string` | `localization.defaultLocale` | Source locale override for this collection. |

> [!IMPORTANT]
> Auto-translate only schedules the work. Nothing is translated unless your runner actually runs it — see [Task runners](#task-runners).

> [!WARNING]
> **Auto-translate publishes what it writes.** A translation it queues off a published save is published in turn, not left as a draft, and there is no setting to hold it back. If translations need review before they go live, trigger them from the admin controls with publish-on-translation off instead.

## Drafts and publishing

Applies to every trigger — the admin controls, `POST {basePath}/enqueue`, and auto-translate.

Everything below describes a collection with `versions.drafts` enabled. **Without drafts there is nothing to stage:** a translation is written straight to the live document, and asking to publish on translation does nothing, silently.

**Without publish-on-translation** the translation is written as a draft version. The document's published state is untouched: a live page stays live, an unpublished one stays unpublished, and the new locale does not reach the public site until someone publishes it.

**With publish-on-translation** the translation is written as a draft and the target locale is then published — which happens whether or not any field actually needed translating. Only the translated locale is published; other locales keep the state they were in. Translating a document that is not currently published does make it live, carrying just that locale's content.

The source is the source locale's **own current content** — the newer draft when one exists, otherwise the published version, never a value Payload substitutes from another locale. Translating *from* a locale you have not filled in therefore translates nothing.

Two consequences worth knowing before relying on it:

- **Publishing publishes the current draft, whatever is in it.** That includes pending edits nobody made for the translation's sake, and non-localized fields, which Payload stores once per document and cannot scope to a locale. Worth remembering before running translate-and-publish over a long list: every unpublished draft among them goes live.
- **`skip_existing` counts anything non-empty as translated.** A translation waiting unpublished in a draft counts, so a reviewer's corrected text is published as it stands rather than re-translated. It has no notion of *reviewed*, and a locale the admin flags as out of date is still skipped ([#118](https://github.com/focusreactive/payload-plugins/issues/118)).

## Translation providers

_Since v0.11.0._

A provider is one method: take `{ 0: "Hello", 1: "World" }` plus a source and target language, and return the same keys translated. Build one from a single request function with `createTranslationProvider`:

```ts
import { createTranslationProvider } from '@focus-reactive/payload-plugin-translator'

const provider = createTranslationProvider({
  complete: async ({ systemPrompt, userContent, responseSchema }) => {
    const reply = await myService.chat({ systemPrompt, userContent, schema: responseSchema })
    return reply.text // return the reply as it came; the plugin reads it
  },
})
```

Or implement the `TranslationProvider` interface directly if you need full control.

### Steering the prompt

`systemPrompt` replaces the instruction sent with every translation request — the place for tone, register, a glossary, or brand terms that must survive untranslated. It receives the source and target language codes plus the prompt the plugin would have sent, so you can extend rather than replace:

```ts
createTranslationProvider({
  complete: openAIComplete({ client, model: 'gpt-5.4-mini' }),
  systemPrompt: ({ sourceLang, targetLang, defaultPrompt }) =>
    `${defaultPrompt}\nUse formal register. Leave product names in ${sourceLang} unchanged.`,
})
```

`sourceLang` is empty when the provider is expected to detect the language itself.

### OpenAI and OpenAI-compatible gateways

`openAIComplete` works with any client exposing a Chat Completions `chat.completions.create` — the OpenAI SDK, Azure OpenAI, OpenRouter, a corporate proxy. You construct the client, so the SDK version is yours to choose.

```ts
createTranslationProvider({
  complete: openAIComplete({
    client: new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    }),
    model: 'anthropic/claude-sonnet-4.5',
    sampling: { temperature: 0 },
    structuredOutput: 'json_object',
  }),
})
```

`structuredOutput` picks how the reply is asked for:

- `'json_schema'` (default) — the reply must satisfy a schema, so a compliant model cannot drop a field. Older models and some gateways reject it with a 400, and the schema has a per-model property ceiling that a very large document can exceed.
- `'json_object'` — asks only for valid JSON. No ceiling, but a field the model drops surfaces as a failed translation afterwards instead of being prevented.

`sampling` is sent only if you set it — several models reject the parameters outright. Pass `{ temperature: 0 }` when you want translations to come out the same way twice.

> [!NOTE]
> `createOpenAIProvider({ apiKey })` still exists and builds the client for you. It is deprecated in favour of the two lines above — see [Deprecated aliases](#deprecated-aliases).

### Provider errors

Provider failures arrive as typed errors, each with a `code` and the original failure on `cause`.

| Error | `code` |
| --- | --- |
| `NoContentError` | `no-content` |
| `UnparseableReplyError` | `unparseable-reply` |
| `KeySetMismatchError` | `key-set-mismatch` |
| `TransportError` | `transport` |
| `ProviderConfigurationError` | `config` |

All extend `TranslationProviderError`; the union of codes is exported as `TranslationFailureCode`.

### Testing without a network

There is no built-in fake — supply your own `complete`, which reaches nothing and needs no API key:

```ts
const fake = createTranslationProvider({
  complete: async ({ userContent }) => {
    const input: Record<string, string> = JSON.parse(userContent)
    return JSON.stringify(
      Object.fromEntries(Object.entries(input).map(([k, v]) => [k, `[de] ${v}`]))
    )
  },
})
```

## Task runners

| Runner | Behaviour |
| --- | --- |
| `createPayloadJobsRunner(options?)` | Translates in the background, one Payload Job per document. The normal choice. |
| `createSyncRunner(options?)` | Translates immediately, before the call returns. No queue to run — handy in tests and scripts. |

`PayloadJobsRunnerOptions`:

| Option | Type | Default |
| --- | --- | --- |
| `taskName` | `string` | `'translate_document'` |
| `queueName` | `string` | `'translations'` |
| `jobsCollection` | `CollectionSlug` | `'payload-jobs'` |
| `autoRun` | `false \| { cron?: string; limit?: number }` | `{ cron: '* * * * *', limit: 50 }` |
| `staleJobTimeoutMs` | `number` | `300000` |
| `retries` | `{ attempts?: number; backoff?: { delay?: number; type: 'exponential' \| 'fixed' } }` | `{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }` |

> [!WARNING]
> `staleJobTimeoutMs` must exceed the longest a single document translation can legitimately take. Set it too low and a translation still running is started again — the document is translated twice, and billed twice.

> [!IMPORTANT]
> Cron autorun does not fire on serverless hosts such as Vercel, so jobs queue and wait. Pass `createPayloadJobsRunner({ autoRun: false })` and drive the queue from your own cron or worker via `POST {basePath}/run/:id`.

`createSyncRunner` keeps the status of what it ran in memory — the last 100 tasks, for an hour, adjustable with `maxSize` and `ttlMs`. A restart forgets them. Nothing is lost but the reporting: the translations themselves are already written.

### Seeing finished jobs

Payload deletes a job the moment it completes, so the "Completed" state never appears in the status panels. Set `jobs: { deleteJobOnComplete: false }` in your **Payload** config to keep them — it is Payload's option, not the plugin's, and pruning what accumulates is yours to manage the same way.

## Access control

```ts
import type { AccessGuard } from '@focus-reactive/payload-plugin-translator'

const signedInOnly: AccessGuard = {
  check: ({ req }) => Boolean(req.user),
}

translatorPlugin({ collections, translationProvider, runner, access: signedInOnly })
```

Return `false` and the request is rejected with `403 Forbidden`. The guard receives the request headers, the authenticated user and the Payload instance, and may be async — so a role or permission check is a lookup away, shaped by your own generated `TypedUser`.

## Lifecycle callbacks

_Since v0.7.0._

Nothing to set up beyond the config — no collection, no migration. A callback that throws is logged and never fails the translation.

```ts
translatorPlugin({
  collections,
  translationProvider,
  runner,
  lifecycle: {
    onQueued: (task) => log.info(task, 'translation queued'),
    onCompleted: (task) => log.info(task, 'translation done'),
    onFailed: (task, error) => log.error({ task, error }, 'translation failed'),
  },
})
```

Each `task` carries `{ collection, id, sourceLng, targetLng, strategy }`. `onQueued` fires once; `onCompleted` / `onFailed` fire per execution attempt, so a retried task can emit `onFailed` more than once.

## Provenance and staleness

_Since v0.7.0._

Set `provenance: true` and the plugin adds a collection that records, for each document and target locale, what the source looked like when that locale was translated. The admin uses it to flag locales whose source has changed since, and an editor can dismiss a flag without re-translating. The record type is exported as `TranslationProvenanceRecord` if you want to read it yourself.

> [!IMPORTANT]
> On a SQL database this adds a table. Generate and run a migration (`payload migrate:create`, then `payload migrate`; dev push works in development). MongoDB infers it with no migration. Leaving `provenance` off means no collection, no migration and no behaviour change.

> [!NOTE]
> **Upgrading from below 0.11.1.** A locale can read as out of date once after the upgrade with nothing actually needing re-translation. Dismissing the flag or re-translating settles it.

## HTTP endpoints you can call

Three endpoints are meant for you. They mount under your Payload API route plus `basePath` — `/api/translate/...` by default — and all go through the `access` guard.

| Method | Path | When you need it |
| --- | --- | --- |
| `POST` | `/enqueue` | Start translations from your own code — a migration, an import, any script. |
| `POST` | `/run/:id` | Run a queued job now. Required wherever cron autorun does not fire, such as Vercel. |
| `POST` | `/field` | Translate one field and get the result back. Mounted only when `levels` includes `fieldLevel()`. |

`POST /enqueue` takes `source_lng`, `target_lng` (one locale or a list), `collection_slug` and `collection_id[]`, plus optional `select_all`, `strategy` (`'overwrite' | 'skip_existing'`, default `'overwrite'`) and `publish_on_translation` (default `false`). Field names are snake_case.

> [!NOTE]
> The plugin mounts further routes under the same `basePath` to serve its own admin panels — status, cancel and staleness. They are not part of the published contract and may change in any release; drive the plugin through the three above.

## Exports reference

| Export | Kind | Purpose |
| --- | --- | --- |
| `translatorPlugin` | function | The plugin itself. |
| `documentLevel`, `collectionLevel`, `fieldLevel` | functions | Translation surfaces for `levels`. |
| `withFieldTranslation` | function | Attach a per-field control, or exclude a field. |
| `withAutoTranslate` | function | Opt a collection into auto-translation. |
| `createTranslationProvider` | function | Build a provider from one `complete` function. |
| `openAIComplete` | function | Chat Completions `complete` for a client you construct. |
| `createPayloadJobsRunner`, `createSyncRunner` | functions | The two ways to run a translation. |
| `toTaskFilter` | function | Builds the document filter a runner accepts. |
| `TranslationProviderError` and subclasses | classes | Typed provider failures. |
| `TranslatorPluginConfig`, `AccessGuard`, `AccessGuardRequest` | types | Plugin configuration. |
| `TranslationProvider`, `TranslationInput`, `TranslationOutput` | types | The provider contract. |
| `CompletionFn`, `CompletionRequest`, `TranslationProviderConfig` | types | The `complete` contract. |
| `SystemPromptBuilder`, `SystemPromptContext`, `JsonSchemaObject` | types | Prompt and schema customization. |
| `OpenAIClientShape`, `OpenAISamplingParams`, `OpenAIStructuredOutput` | types | OpenAI adapter. |
| `TaskRunnerProvider`, `PayloadJobsRunnerOptions`, `TaskFilter` | types | Task runners. |
| `TranslationLevel`, `TargetSelectionMode` | types | Surfaces and target selection. |
| `AutoTranslateConfig`, `AutoTranslateStrategy`, `FieldTranslationConfig` | types | Collection and field configuration. |
| `TranslationTask`, `TranslationLifecycleCallbacks` | types | Lifecycle callbacks. |
| `TranslationProvenanceRecord` | type | One stored provenance record. |

## Experimental: rich text one container at a time

> [!WARNING]
> Shipped in `0.13.0` behind `experimental: { inlineMarks: true }`, off by default, and deprecated on arrival — the next major removes the flag and makes container mode the only mode. Treat it as a schedule, not a permanent switch: do not build on the option itself.

With the flag off, a translated sentence keeps the source language's word order, and bold or a link can end up on the wrong word. `a **red** car` into French comes back as un **rouge** voiture — ungrammatical, with the emphasis misplaced.

With the flag on, the whole container — a paragraph, a heading, one list item — goes as a single string with its formatting written as numbered marks:

```
<1>a </1><2>red</2><3> car</3>
```

Your provider must return those markers intact — translated and reordered as the target language needs, but neither translated themselves nor dropped. The same sentence then comes back as une voiture **rouge**: the emphasis stays on the word it belonged to, and links travel with theirs.

The flag does nothing unless your provider declares that it can handle the markers:

```ts
createTranslationProvider({
  complete: openAIComplete({ client, model: 'gpt-5.4-mini' }),
  capabilities: { inlineMarks: true },
})
```

Declare it only for a service you trust to return the markers untouched — a plain machine-translation API would translate or drop them. A container whose reply comes back with broken markers is left in its source language rather than written back half-translated.

Switching the flag back off changes only future translations; documents already translated under it keep the structure they have.

## Versioning

This package is on `0.x`, and that is not a formality. The surface still moves, contracts still change, and the next major will take a fair amount away. What it will not do is move silently — the terms are:

- **Nothing is removed without a deprecation first.** The old name keeps working until the next major, and [`docs/DEPRECATIONS.md`](https://github.com/focusreactive/payload-plugins/blob/main/packages/payload-plugin-translator/docs/DEPRECATIONS.md) records why each one is going.
- **Releases follow semver**, so a breaking change never arrives as a patch.
- **Anything added since `0.5.0` says which release it arrived in** — as a _Since_ note beside the feature here, and as an `@since` tag in its JSDoc, so your editor answers the question too. Older API predates the convention and carries no marker.

Already scheduled for the next major: everything in [Deprecated aliases](#deprecated-aliases), and the `experimental.inlineMarks` flag, when container mode becomes the only mode. Use none of those and the upgrade is a version bump.

## Deprecated aliases

Still exported, removed in the next major. The reasoning behind each is in [`docs/DEPRECATIONS.md`](https://github.com/focusreactive/payload-plugins/blob/main/packages/payload-plugin-translator/docs/DEPRECATIONS.md).

| Deprecated | Use instead |
| --- | --- |
| `createTranslatePlugin`, `TranslateCollectionPlugin` | `translatorPlugin` |
| `TranslateCollectionPluginConfig` | `TranslatorPluginConfig` |
| `translateKitField` | `withFieldTranslation` |
| `TranslateKitFieldConfig` | `FieldTranslationConfig` |
| `OpenAITranslationProvider`, `createOpenAIProvider` | `createTranslationProvider` + `openAIComplete` |
| `dryRun` on a provider config | Your own `complete` function |

## Troubleshooting

**The Translate control does not appear.** Run `payload generate:importmap` after registering the plugin, and restart the dev server.

**Nested localized fields are skipped.** You passed sanitized configs. `collections` must receive the same objects you give `buildConfig` — Payload's sanitizer strips `localized` from fields nested under a localized ancestor.

**Jobs stay queued forever.** Nothing is draining the queue. Check that autorun is enabled, or trigger `POST /api/translate/run/:id` yourself on platforms where cron does not run.

**`ProviderConfigurationError` saying the model does not support the json_schema response format, or that the schema was rejected.** The model or gateway would not accept the schema request, or the document was too large for it. Switch to `structuredOutput: 'json_object'`.

**A per-field control on a field that is not text.** `withFieldTranslation` adds a control only to `text`, `textarea` and `richText`; any other field type must be passed `{ exclude: true }`.

## License

MIT © [Focus Reactive](https://focusreactive.com/)
