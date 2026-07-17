# @focus-reactive/payload-plugin-translator

[![npm version](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-translator)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-translator)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/focusreactive/payload-plugins/blob/main/LICENSE)

Translate localized content in **Payload CMS 3** with any provider — a whole document, a whole collection, or a single field — straight from the admin UI.

## About

Payload localizes your content, but it doesn't translate it — you still copy text between locales by hand. This plugin closes that gap: it walks every localized field (including deeply nested groups, arrays, blocks, tabs, and Lexical rich text), sends the text to a translation provider, and writes the result back to the target locale.

It works at three levels — translate the **document** you're editing, **bulk-translate** a collection from its list view, or translate a **single field** in place. Providers are pluggable (OpenAI is built in), and translation runs through a configurable runner (async Payload Jobs by default, or synchronously).

## Features

- **Deep translation** — every localized leaf field at any nesting level (groups, arrays, blocks, tabs).
- **Rich text** — full Lexical translation, preserving formatting and structure.
- **Three surfaces** — a per-document popup, a bulk-collection dashboard, and a per-field control, toggled via `levels`.
- **Async or sync** — queue-based background jobs (Payload Jobs) by default, or run inline.
- **Pluggable providers** — OpenAI built in, or implement your own.
- **Strategies** — overwrite everything or skip locales that already have content.
- **Field control** — add a per-field Translate button, or exclude a field from translation.

## Requirements

| Peer dependency                | Version        |
| ------------------------------ | -------------- |
| `payload`                      | `^3.76.0`      |
| `@payloadcms/ui`               | `^3.76.0`      |
| `@payloadcms/richtext-lexical` | `^3.76.0`      |
| `react`                        | `^18` or `^19` |

Your Payload config must have [localization](https://payloadcms.com/docs/configuration/localization) enabled.

## Installation

```bash
npm install @focus-reactive/payload-plugin-translator
# pnpm add @focus-reactive/payload-plugin-translator
# bun add  @focus-reactive/payload-plugin-translator
# yarn add @focus-reactive/payload-plugin-translator
```

## Quick Start

```typescript
import { buildConfig } from "payload";
import { translatorPlugin, createOpenAIProvider, createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { Posts } from "./collections/Posts";
import { Pages } from "./collections/Pages";

export default buildConfig({
  collections: [Posts, Pages],
  localization: {
    locales: ["en", "de", "fr"],
    defaultLocale: "en",
  },
  plugins: [
    translatorPlugin({
      collections: [Posts, Pages], // the same config objects you pass to buildConfig
      translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
      runner: createPayloadJobsRunner(),
    }),
  ],
});
```

Open a localized document in the admin — a **Translate** control appears, and the collection list view gains a **bulk** dashboard.

## Translation surfaces (`levels`)

_Since v0.5.0._

`levels` controls which translation surfaces the plugin exposes. Each entry is a factory you import and list:

| Level               | Surface                                                                                                         | Runs                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `documentLevel()`   | A **Translate** popup on the document edit view (one document).                                                 | via `runner`           |
| `collectionLevel()` | A **bulk dashboard** on the collection list view (many at once).                                                | via `runner`           |
| `fieldLevel()`      | A per-field **Translate** control + a synchronous `POST {basePath}/field` endpoint (one field). _Since v0.6.0._ | synchronous, no runner |

Omit `levels` for the default `[documentLevel(), collectionLevel()]` — adopting the option is non-breaking.

```typescript
import { translatorPlugin, collectionLevel, createOpenAIProvider, createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

translatorPlugin({
  collections: [Posts],
  translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  runner: createPayloadJobsRunner(),
  levels: [collectionLevel()], // bulk dashboard only — no per-document popup
});
```

The document and collection levels show a real-time **progress indicator** while jobs run.

### Field-level translation

_Since v0.6.0._

`fieldLevel()` adds a per-field **Translate** control. Two steps:

1. Add `fieldLevel()` to `levels` (registers the endpoint).
2. Wrap the fields that should get a control with `withFieldTranslation(field)`.

```typescript
import { translatorPlugin, documentLevel, fieldLevel, withFieldTranslation, createOpenAIProvider, createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

// In a collection:
const Posts = {
  slug: "posts",
  fields: [withFieldTranslation({ name: "title", type: "text", localized: true })],
};

// In the plugin:
translatorPlugin({
  collections: [Posts],
  translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  runner: createPayloadJobsRunner(),
  levels: [documentLevel(), fieldLevel()],
});
```

The control is an icon button (just above the input) that opens a compact popup with the translation **direction**: a source-locale `Select`, an arrow, then the **current locale** (the fixed target) — `en → fr`. You pick the **source**; the **target is always the locale you're editing**. The server reads the source locale's _saved_ value and translates it into the current locale, so the control needs a **saved document** (it's hidden while creating one). The result is written straight to form state — no save, no queue — and an **Undo** restores the previous value.

Allowed on **`text`, `textarea`, and `richText`** fields (a compile error on other types — pass `{ exclude: true }` for those). For `richText` the Lexical editor re-mounts with the translated content. Fields **inside blocks** are supported: the server reads the source document's `blockType` to resolve the right block schema.

> **Localized `blocks`/`array` containers.** Per-field translation works when the **container is not localized** — the structure is then shared across locales and only the leaf values differ, so wrap the leaves, not the container. If a `blocks`/`array` field is itself `localized`, each locale has an independent structure (different order/content), so a field inside it can't be matched to the source locale by position — the control no-ops with a notice to translate the whole document instead (whole-document translation handles this by matching elements by `id`).

> This direction is intentionally the reverse of the document/collection level (which translates _from_ the current locale _to_ chosen targets): the field control pulls content _into_ the locale you're standing in.

## Configuration

### `translatorPlugin(config)`

| Property              | Type                  | Required | Default                                | Description                                                                                                    |
| --------------------- | --------------------- | -------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `collections`         | `CollectionConfig[]`  | Yes      | —                                      | Collection configs to enable translation for. Must be the **same objects** passed to `buildConfig`, not slugs. |
| `translationProvider` | `TranslationProvider` | Yes      | —                                      | Provider instance (e.g. `createOpenAIProvider(...)`).                                                          |
| `runner`              | `TaskRunnerProvider`  | Yes      | —                                      | Runner for background processing (e.g. `createPayloadJobsRunner()`).                                           |
| `access`              | `AccessGuard`         | No       | `undefined`                            | Access guard (`{ check }`) for the translation endpoints; omit to leave them open.                             |
| `basePath`            | `string`              | No       | `'/translate'`                         | Base path for the plugin's API endpoints.                                                                      |
| `levels`              | `TranslationLevel[]`  | No       | `[documentLevel(), collectionLevel()]` | Which surfaces to enable — see [Translation surfaces](#translation-surfaces-levels).                           |
| `provenance`          | `boolean \| { slug?: string }` | No | `false` (disabled) | Opt in to recording a provenance record per translation. _Since v0.7.0._ See [Provenance](#provenance-opt-in) below. |
| `lifecycle`           | `{ onQueued?, onCompleted?, onFailed? }` | No | `undefined` | Server-side callbacks fired around each task. _Since v0.7.0._ See [Lifecycle callbacks](#lifecycle-callbacks). |

```typescript
translatorPlugin({
  collections: [Posts, Pages],
  translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  runner: createPayloadJobsRunner(),
  access: { check: ({ req }) => req.user?.role === "admin" },
});
```

### Provenance (opt-in)

_Since v0.7.0._

Set `provenance: true` (or `{}`) to record, after each successful translation, a durable per-locale
provenance entry — what source state a translation was derived from. Use `{ slug }` to customise the
sidecar collection's slug (default `'translator-provenance'`), e.g. to resolve a name collision with
one of your own collections. Omit (or set `false`) to leave everything as-is: no collection, no
migration, no behavior change.

Enabling it adds a plugin-managed, hidden sidecar collection to your config. **On a SQL database
(Postgres/SQLite) this requires a migration** — run `payload migrate:create` then `payload migrate`
(or let dev push apply it in development). MongoDB infers the collection with no migration step.

When a translated document is deleted, its provenance rows are cleaned up automatically (across all
locales). The cleanup is best-effort — a failure is logged and never blocks the delete. The exported
`TranslationProvenanceRecord` type describes a stored row if you query the sidecar collection directly.

```typescript
translatorPlugin({
  collections: [Posts, Pages],
  translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  runner: createPayloadJobsRunner(),
  provenance: true, // or { slug: "my-provenance" }
});
```

### Stale-translation detection

_Since v0.8.0._

With `provenance` enabled, the document translation control shows an **"out of date"** marker (with a
tooltip naming the affected locales) when a target locale's source content changed after it was
translated. Open the translation popup to see the per-locale list, where each locale can be
**re-translated** or its out-of-date notice **dismissed**.
Staleness is derived on read by comparing the current source fingerprint against the one recorded at
translation time — no extra configuration, and no write-side hook on your collections. Editing a
source locale marks its already-translated locales stale on the next panel view; re-translating clears it.

Dismiss acknowledges the drift without re-translating; the marker stays hidden until the source
changes again. When `provenance` is disabled nothing is shown. Note the fingerprint is text-only, so
formatting-only edits to rich text do not mark a locale stale.

### Auto-translate on source change

_Since v0.9.0._

Opt in per collection with `withAutoTranslate` and the plugin queues translations automatically when a
document's source-locale content changes — no manual trigger. Off by default; a collection is enabled
only by wrapping it.

```ts
import { translatorPlugin, withAutoTranslate, createOpenAIProvider, createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

translatorPlugin({
  collections: [withAutoTranslate(Posts, { targets: ["de", "fr"], debounceMs: 2000 })],
  translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  runner: createPayloadJobsRunner(),
});
```

| Option | Type | Default | Meaning |
| ------ | ---- | ------- | ------- |
| `targets` | `string[]` | — | Locales to translate into. The source locale is always excluded. |
| `strategy` | `"overwrite" \| "skip_existing"` | `"overwrite"` | How target content is written. |
| `debounceMs` | `number` | `0` | Delay before the job runs, coalescing rapid edits (see below). |
| `sourceLocale` | `string` | `localization.defaultLocale` | Override the source locale for this collection. |

Behaviour: fires only on a **published** source save (draft/autosave saves are ignored; a collection
without drafts treats every save as published); skips when no translatable content actually changed
(same fingerprint as stale-detection); coalesces rapid edits via `debounceMs`; the translation is saved
with the source document's status (published source → published translation); never re-triggers on its
own translation writes; and never fails the editor's save (best-effort — failures are logged).

> **Requires a working job runner.** Auto-translate only **enqueues** jobs — they run via the task
> runner (`createPayloadJobsRunner`) and its autorun loop. On serverless platforms such as **Vercel**,
> cron-based autorun may not run automatically, so enqueued translations can sit unexecuted until
> triggered — e.g. an external cron hitting the run endpoint, or a self-hosted worker. Make sure your
> deployment actually executes queued jobs before relying on auto-translate.

### Lifecycle callbacks

_Since v0.7.0._

Optional server-side hooks fired around each translation task — for logging, notifications, cache
invalidation, or feeding a dashboard. They need no schema or migration and are independent of the
`provenance` opt-in. Each receives a `TranslationTask` descriptor
(`{ collection, id, sourceLng, targetLng, strategy }`); `onFailed` also receives the error.

A callback that throws is caught and logged — it never fails the translation. `onCompleted` /
`onFailed` fire per execution attempt (the Payload Jobs runner may retry a failed task); `onQueued`
fires once at enqueue.

```typescript
translatorPlugin({
  collections: [Posts, Pages],
  translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  runner: createPayloadJobsRunner(),
  lifecycle: {
    onQueued: (task) => console.log("queued", task),
    onCompleted: (task) => console.log("done", task),
    onFailed: (task, error) => console.error("failed", task, error),
  },
});
```

### Providers

#### OpenAI (built in) — `createOpenAIProvider(config)`

| Property       | Type                      | Required | Default              | Description                                                                                                     |
| -------------- | ------------------------- | -------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apiKey`       | `string`                  | Yes      | —                    | OpenAI API key.                                                                                                 |
| `model`        | `string \| ChatModel`     | No       | `'gpt-4o'`           | Model used for translation.                                                                                     |
| `systemPrompt` | `SystemPromptBuilder`     | No       | Built-in prompt      | Custom system-prompt builder.                                                                                   |
| `dryRun`       | `boolean \| DryRunConfig` | No       | `false`              | Simulate translations without API calls.                                                                        |
| `timeout`      | `number`                  | No       | SDK default (10 min) | Per-request timeout (ms). A job blocks on this call, so the 10-min default is usually too long. _Since v0.6.0._ |
| `maxRetries`   | `number`                  | No       | SDK default (2)      | Max automatic retries on transient errors (429/5xx/network). `0` disables. _Since v0.6.0._                      |

```typescript
createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  systemPrompt: ({ sourceLang, targetLang, defaultPrompt }) => `${defaultPrompt}\nUse formal language. Keep brand names unchanged.`,
});
```

`systemPrompt` receives `{ sourceLang, targetLang, defaultPrompt }` and returns the prompt string. When `dryRun` is an object it can transform text locally with an optional delay:

```typescript
type DryRunConfig = {
  transform: (text: string) => string | Promise<string>;
  timeout?: number; // ms, simulates API latency
};
```

#### Custom provider

Implement the `TranslationProvider` interface — a single `translate` method:

```typescript
import type { TranslationProvider, TranslationInput, TranslationOutput } from "@focus-reactive/payload-plugin-translator";

// TranslationInput / TranslationOutput are Record<number, string> — a map of
// numeric indices to text. The indices map to positions in the document; the
// provider MUST return the same keys with translated values.
class DeepLProvider implements TranslationProvider {
  constructor(private apiKey: string) {}

  async translate(content: TranslationInput, sourceLng: string, targetLng: string): Promise<TranslationOutput | null> {
    try {
      const response = await fetch("https://api.deepl.com/v2/translate", {
        method: "POST",
        headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: Object.values(content), source_lang: sourceLng.toUpperCase(), target_lang: targetLng.toUpperCase() }),
      });
      const data = await response.json();

      const result: TranslationOutput = {};
      Object.keys(content).forEach((key, i) => {
        result[key] = data.translations[i].text;
      });
      return result;
    } catch {
      return null; // null aborts the translation for this chunk
    }
  }
}

translatorPlugin({
  collections: [Posts],
  translationProvider: new DeepLProvider(process.env.DEEPL_API_KEY),
  runner: createPayloadJobsRunner(),
});
```

### Runners

Document- and collection-level translation run through a **runner**.

#### `createPayloadJobsRunner(options)` (recommended)

Background processing via Payload's job queue.

| Property    | Type                       | Required | Default                            | Description                                                                                           |
| ----------- | -------------------------- | -------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `taskName`  | `string`                   | No       | `'translate_document'`             | Task name in the Payload jobs collection.                                                             |
| `queueName` | `string`                   | No       | `'translations'`                   | Queue name for grouping jobs.                                                                         |
| `autoRun`   | `false \| { cron, limit }` | No       | `{ cron: '* * * * *', limit: 50 }` | Auto-run schedule, or `false` to disable (e.g. for serverless, where you trigger the queue yourself). |

```typescript
createPayloadJobsRunner({ taskName: "translate_document", queueName: "translations", autoRun: { cron: "* * * * *", limit: 50 } });
```

> By default Payload deletes a job as soon as it completes, so the "Completed" status never shows in the UI. Set `jobs: { deleteJobOnComplete: false }` in your Payload config to keep it.

#### `createSyncRunner()`

Runs translations inline (no queue) — handy for development or small datasets.

```typescript
import { createSyncRunner } from "@focus-reactive/payload-plugin-translator";

translatorPlugin({ collections: [Posts], translationProvider, runner: createSyncRunner() });
```

### Field config — `withFieldTranslation(field, config?)`

A plain wrap on a `text` / `textarea` / `richText` field adds the per-field Translate control (requires `fieldLevel()`); `{ exclude: true }` opts a field out of translation entirely.

| Property  | Type      | Required | Default | Description                          |
| --------- | --------- | -------- | ------- | ------------------------------------ |
| `exclude` | `boolean` | No       | `false` | Exclude this field from translation. |

```typescript
import { withFieldTranslation } from "@focus-reactive/payload-plugin-translator";

withFieldTranslation({ name: "title", type: "text", localized: true }); // adds the control
withFieldTranslation({ name: "sku", type: "text", localized: true }, { exclude: true }); // never translated
```

### Strategies

How existing target-locale content is treated when translating:

| Strategy          | Behavior                                                   |
| ----------------- | ---------------------------------------------------------- |
| `'overwrite'`     | _(Default)_ Replace all existing translated content.       |
| `'skip_existing'` | Only translate fields that are empty in the target locale. |

## Notes & gotchas

### Mark nested fields `localized: true` explicitly

Payload lets a wrapper field (group, array, blocks, tabs) be `localized`, which makes nested fields inherit localization. The plugin, however, only translates **leaf** fields (text, textarea, richText), so each one you want translated must carry `localized: true` itself:

```typescript
// ❌ nested title is not explicitly localized — skipped
{ name: "meta", type: "group", localized: true, fields: [{ name: "title", type: "text" }] }

// ✅ title is explicitly localized — translated
{ name: "meta", type: "group", localized: true, fields: [{ name: "title", type: "text", localized: true }] }
```

### Excluded fields are still backfilled

`{ exclude: true }` means "never send this field to the provider" — not "leave it untouched." If an excluded field is empty in the target locale, it's filled from the source locale (so required fields don't fail validation on save). Exclusion takes priority over the `overwrite` strategy: an excluded field keeps its target value if present, copies the source value only when target is empty, and is never sent to the provider.

### Keeping completed-job status

See the `deleteJobOnComplete: false` note under [Runners](#createpayloadjobsrunneroptions-recommended).

## TypeScript

The package ships its types. Besides the factories, the following are exported for typing your own code:

```typescript
import type {
  TranslatorPluginConfig,
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  OpenAIProviderConfig,
  DryRunConfig,
  TaskRunnerProvider,
  PayloadJobsRunnerOptions,
  TranslationLevel,
  FieldTranslationConfig,
  AccessGuard,
  AccessGuardRequest,
  TranslationTask, // descriptor passed to the lifecycle callbacks — Since v0.7.0
  TranslationLifecycleCallbacks, // shape of the `lifecycle` config — Since v0.7.0
  TranslationProvenanceRecord, // a stored provenance row — Since v0.7.0
} from "@focus-reactive/payload-plugin-translator";
```

## Versioning

Every public API is annotated with `@since x.y.z` in its JSDoc, and features carry a `Since vX.Y.Z` note here — so you can tell at a glance whether your installed version has a given capability without cross-referencing the changelog. Releases follow semver.

## Roadmap

Planned features building on the provenance foundation:

- **Global translation dashboard** — translate across all collections from one place, with project-wide progress.
- **Auto-translate on source change** — retranslate automatically when default-locale content changes, driven by stale-translation detection.

## License

[MIT](https://github.com/focusreactive/payload-plugins/blob/main/LICENSE) © Focus Reactive.
