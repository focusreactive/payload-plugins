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
- **Single or multi target** — translate into one locale, or pick several at once, via `targetSelection`.
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
| `targetSelection`     | `'single' \| 'multi'` | No       | `'single'`                             | Let an editor pick several target locales in one run. _Since v0.10.0._ See [Target-language selection](#target-language-selection) below. |

```typescript
translatorPlugin({
  collections: [Posts, Pages],
  translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  runner: createPayloadJobsRunner(),
  access: { check: ({ req }) => req.user?.role === "admin" },
});
```

### Target-language selection

_Since v0.10.0._

By default the translation forms (per-document panel and bulk dashboard) translate into **one**
target locale per run. Set `targetSelection: 'multi'` to let an editor pick **several** target
locales at once — the "To" field becomes a compact multi-select and the run fans out one translation
per _(document × target locale)_.

```typescript
translatorPlugin({
  collections: [Posts, Pages],
  translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
  runner: createPayloadJobsRunner(),
  targetSelection: "multi", // default is "single" (one target per run — unchanged)
});
```

Fully backward-compatible and opt-in: the default `'single'` keeps today's behaviour exactly, and
there is no schema or migration. Unknown or duplicate target locales are ignored, and the source
locale is never translated into itself. The `/enqueue` endpoint accepts `target_lng` as either a
single string or an array of strings, so existing API callers keep working.

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

### Drafts and publishing

Applies to every way a translation is triggered — the admin controls, `POST /translate/enqueue`, and
auto-translate. It matters most if your collections have `versions.drafts` enabled.

**Without publish-on-translation**, the translation is written as a **draft version**. The document's
published state is left alone: a live page stays live, an unpublished one stays unpublished, and the
translated locale does not appear on the public site until someone publishes it.

**With publish-on-translation**, the translation is published — and only the locale that was
translated. Other locales keep whatever state they were in, and their pending drafts are not carried
live alongside it. Note that this publishes the *translated content*, so translating a document that
is not currently published does make the document live, with just that locale's content in it.

Two consequences worth knowing before you rely on them:

- **`skip_existing` means something different in each mode.** Without publishing it skips what is in
  the draft, so a reviewer's corrections there are preserved. With publishing it skips what is
  already **published** — a translation sitting unpublished in a draft is not seen, so the field is
  translated again and the machine result replaces the correction in the draft as well as going live
  ([#116](https://github.com/focusreactive/payload-plugins/issues/116)). To ship a translation a
  reviewer has corrected, publish the document from the Payload admin rather than re-running the
  translation.
- **A locale can read as translated while the public site shows nothing.** Stale-detection records a
  translation as soon as it is written, including into a draft. That is deliberate — the work exists
  and is waiting on a human, so re-translating would be wrong — but "up to date" is not the same
  statement as "live".

> **Changed in 0.11.1.** Before this, translating one locale as a draft unpublished the document in
> every locale, and translating one locale with publishing pushed every other locale's unpublished
> draft live. See [#102](https://github.com/focusreactive/payload-plugins/issues/102).

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
with the source document's status, scoped to **only the translated locale**; never re-triggers on its
own translation writes; and never fails the editor's save (best-effort — failures are logged).

> See [Drafts and publishing](#drafts-and-publishing) for what a translation does to a document's
> published state.

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

Pass **either** an `apiKey` **or** a ready-made `client` — never both; the types enforce it.

| Property       | Type                      | Required           | Default              | Description                                                                                                     |
| -------------- | ------------------------- | ------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apiKey`       | `string`                  | Unless `client`    | —                    | OpenAI API key. The `openai` package is loaded on first translation, not at config load. _Since v0.11.0: optional when `client` is given._ |
| `client`       | `OpenAIClientShape`       | Unless `apiKey`    | —                    | Your own client — Azure OpenAI, a corporate proxy, OpenRouter, anything with a matching `chat.completions.create`. On this path the `openai` package is never loaded. _Since v0.11.0._ |
| `model`        | `string`                  | No                 | `'gpt-4o'`           | Model used for translation. **The default may change in a minor release** — pin it if you need reproducible output and cost. |
| `systemPrompt` | `SystemPromptBuilder`     | No                 | Built-in prompt      | Custom system-prompt builder.                                                                                   |
| `dryRun`       | `boolean \| DryRunConfig` | No                 | `false`              | **Deprecated** — see the note below. Simulates translations without API calls, but still writes, publishes and records provenance. |
| `sampling`     | `OpenAISamplingParams`    | No                 | not sent             | `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`. Omitted entirely unless set — several models reject them. **Before v0.11.0 this package always sent `temperature: 0, top_p: 1, frequency_penalty: 0, presence_penalty: 0`**, so translations were deterministic; they now follow the model's defaults. Set `{ temperature: 0 }` to restore that. _Since v0.11.0._ |
| `structuredOutput` | `"json_schema" \| "json_object"` | No | `"json_schema"` | Which structured-output envelope to send. See the note below — the two carry different risks. _Since v0.11.0._ |
| `timeout`      | `number`                  | No                 | `60000`              | Per-request timeout (ms) for the client this package builds. Ignored when you pass your own `client`. _Since v0.6.0; the default dropped from the SDK's 10 minutes to 60 s in v0.11.0._ |
| `maxRetries`   | `number`                  | No                 | SDK default (2)      | Max automatic retries on transient errors (429/5xx/network) for the client this package builds. `0` disables. Ignored when you pass your own `client`. _Since v0.6.0._ |

> **`createOpenAIProvider` is deprecated and goes away in the next major.** What it adds over
> `openAIComplete` is building the SDK client for you — and carrying `openai` as an optional
> dependency of ours to do it, which is where the cost is: a lazy import shaped around deployment
> file-tracers, and a classifier telling "not installed" from "installed but broken" across four
> runtimes. Construct the client yourself instead and keep everything else:
>
> ```typescript
> import OpenAI from "openai";
> import {
>   createTranslationProvider,
>   openAIComplete,
> } from "@focus-reactive/payload-plugin-translator";
>
> // The SDK's own default timeout is ten minutes — far too long for a live edit.
> const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000 });
>
> const translationProvider = createTranslationProvider({
>   complete: openAIComplete({ client, model: "gpt-4o" }),
> });
> ```
>
> `openAIComplete` stays: the request body, the `structuredOutput` choice below, and the message
> naming that option when a gateway rejects a strict schema are all still ours. What becomes yours
> is the SDK version and the client's own settings, the timeout most of all.
> See [docs/DEPRECATIONS.md](docs/DEPRECATIONS.md#openai-client-construction).

#### Choosing a structured-output envelope

`json_schema` (the default) sends the request with a schema the reply must satisfy, so a compliant
model **cannot** drop a requested field. That is what closed the silent half-translation defect. It
costs two things:

- Older models, and some gateways (OpenRouter with certain upstream models, older Azure
  deployments, self-hosted proxies), reject it with a 400. You do not need to know which: the error
  names this option as the fix.
- The schema has a size limit, so **one request carries a limited number of pieces of text**, and a
  document past that ceiling fails as a whole. The schema names one property per translatable piece,
  and rich text is split one piece per text node — a sentence with two emphasised spans is already
  four pieces — so the count grows faster than "one per field" suggests, and a document is never
  split across requests. The ceiling differs by model and moves over time; measure it against your
  largest documents rather than assuming headroom.

`json_object` asks only for valid JSON. There is no schema, so no ceiling — but key preservation
falls back to this package's key-set check, which **detects** a dropped key instead of preventing
it. A reply missing one key out of two hundred still writes the other 199, the gap is reported to
the server log, and only a reply matching nothing at all fails. Your editors never see that log, so
a dropped field looks translated in the admin UI.

Pick by which risk you would rather carry: a hard failure on very large documents, or a quiet gap on
any document.

```typescript
// Quick start
createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  systemPrompt: ({ sourceLang, targetLang, defaultPrompt }) => `${defaultPrompt}\nUse formal language. Keep brand names unchanged.`,
});

// Your own client — Azure, a proxy, OpenRouter. Since v0.11.0.
import OpenAI from "openai";

createOpenAIProvider({
  client: new OpenAI({ apiKey: process.env.AZURE_KEY, baseURL: process.env.AZURE_ENDPOINT }),
  model: "gpt-4o",
});
```

`systemPrompt` receives `{ sourceLang, targetLang, defaultPrompt }` and returns the prompt string. When `dryRun` is an object it can transform text locally with an optional delay:

```typescript
type DryRunConfig = {
  transform: (text: string) => string | Promise<string>;
  timeout?: number; // ms, simulates API latency
};
```

> **`dryRun` is deprecated and will be removed in the next major.** It skips the network call and
> nothing else: the transformed strings are still written to the target locale, still published when
> `publishOnTranslation` is set, and still recorded as provenance — after which the locale reads as
> up to date and no re-translation is prompted. Use your own fake instead, which is explicit about
> being one:
>
> ```typescript
> import { createTranslationProvider } from "@focus-reactive/payload-plugin-translator";
>
> const fakeProvider = createTranslationProvider({
>   complete: async ({ userContent }) => {
>     const input = JSON.parse(userContent) as Record<string, string>;
>     const reversed: Record<string, string> = {};
>     for (const [key, value] of Object.entries(input)) {
>       reversed[key] = value.trim() ? [...value].reverse().join("") : value;
>     }
>     return JSON.stringify(reversed);
>   },
> });
> ```
>
> `complete` returns the reply as raw text, exactly as a service would; parsing and validation stay
> on our side. See [docs/DEPRECATIONS.md](docs/DEPRECATIONS.md#provider-dry-run).

#### Another service — `createTranslationProvider(config)`

_Since v0.11.0._

Need a different model provider, or full control of the request body? Supply one function — "send this text, give me the reply" — and keep everything else. The prompt, the response schema, reply parsing, key-set validation, dry-run simulation and the failure taxonomy all stay on our side, so you cannot accidentally skip them.

For OpenAI specifically you do not have to write that function: `openAIComplete({ client, model })` is one, built from a client you constructed. _Since v0.11.0._

```typescript
import { createTranslationProvider } from "@focus-reactive/payload-plugin-translator";

const provider = createTranslationProvider({
  complete: async ({ systemPrompt, userContent, responseSchema }) => {
    const reply = await myService.chat({
      system: systemPrompt,
      user: userContent,
      schema: responseSchema, // hand this to whatever structured-output mechanism your service offers
    });
    return reply.text; // raw text, not a parsed object — we parse it
  },
});
```

> `signal` is reserved and currently always `undefined` — the port does not carry cancellation yet, so wiring it into your client is harmless but has no effect today. It is in the request shape so that adding cancellation later is a pure addition rather than a breaking change.

| Property       | Type                      | Required | Default         | Description                                        |
| -------------- | ------------------------- | -------- | --------------- | -------------------------------------------------- |
| `complete`     | `CompletionFn`            | Yes      | —               | Sends one request, returns the reply as raw text.  |
| `systemPrompt` | `SystemPromptBuilder`     | No       | Built-in prompt | Custom system-prompt builder.                      |
| `dryRun`       | `boolean \| DryRunConfig` | No       | `false`         | **Deprecated** — supply your own fake `complete`.  |

Your `complete` owns the timeout, the retry policy and the credentials — this package adds no retry of its own and imposes no timeout on your call.

#### Failure causes

_Since v0.11.0._

Every built-in provider throws a typed error naming what went wrong, instead of returning `null`:

| Error                       | `code`               | Means                                                                  |
| --------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `NoContentError`            | `no-content`         | The reply was empty, or the service filtered it.                       |
| `UnparseableReplyError`     | `unparseable-reply`  | The reply was not JSON, or not an object.                              |
| `KeySetMismatchError`       | `key-set-mismatch`   | The reply answered none of the requested fields.                       |
| `TransportError`            | `transport`          | The call failed — network, auth, rate limit, timeout.                  |
| `ProviderConfigurationError`| `config`             | The provider cannot work as configured (usually a missing optional SDK). |

All extend `TranslationProviderError`, so one `catch` covers them. The original failure is on the standard `cause` property — never copied into `message`, because that text can reach an HTTP response body and a vendor error may carry your API key.

A **partial** reply is not an error: the fields that came back are applied, and the ones that did not are named in a warning. That is deliberate — dropping good translations because one field is missing helps nobody — but it does mean a partial translation still completes.

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
    } catch (cause) {
      // Throwing is preferred — the cause reaches the log and the editor sees why it failed.
      // Returning `null` still works and still aborts the whole run, but it says nothing about why.
      throw new Error("DeepL translation failed", { cause });
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
