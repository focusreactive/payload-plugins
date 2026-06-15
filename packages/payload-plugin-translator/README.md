# @focus-reactive/payload-plugin-translator

Translation plugin for Payload CMS 3.x. Automatically translate your localized content using any translation provider.

## Features

- **Deep translation** — translates all localized fields at any nesting level (groups, arrays, blocks, tabs)
- **Rich text support** — full Lexical rich text translation preserving formatting and structure
- **Bulk translation** — translate multiple documents at once from collection list view
- **Progress tracking** — real-time translation status indicators in admin UI
- **Async processing** — queue-based background jobs (Payload Jobs) or synchronous mode
- **Pluggable providers** — use OpenAI or create custom translation providers
- **Field exclusion** — exclude specific fields from translation via `withFieldTranslation`
- **Translation strategies** — choose between overwrite all or skip existing translations
- **Configurable surfaces** — enable the per-document popup and/or the bulk-collection dashboard via the `levels` option _(since v0.5.0)_

## Installation

```bash
# npm
npm install @focus-reactive/payload-plugin-translator

# bun
bun add @focus-reactive/payload-plugin-translator

# pnpm
pnpm add @focus-reactive/payload-plugin-translator

# yarn
yarn add @focus-reactive/payload-plugin-translator
```

## Quick Start

```typescript
import { buildConfig } from "payload";
import { translatorPlugin, createOpenAIProvider, createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { Posts } from "./collections/Posts";
import { Pages } from "./collections/Pages";

export default buildConfig({
  collections: [Posts, Pages],
  plugins: [
    translatorPlugin({
      collections: [Posts, Pages],
      translationProvider: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
      }),
      runner: createPayloadJobsRunner(),
    }),
  ],
  localization: {
    locales: ["en", "de", "fr"],
    defaultLocale: "en",
  },
});
```

## Configuration

### TranslatorPluginConfig

Configuration for `translatorPlugin()`.

| Property              | Type                  | Required | Default                                | Description                                                                                                         |
| --------------------- | --------------------- | -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `collections`         | `CollectionConfig[]`  | Yes      | —                                      | Original collection configs to enable translation for. Must be the same objects passed to `buildConfig`, not slugs. |
| `translationProvider` | `TranslationProvider` | Yes      | —                                      | Translation provider instance (e.g., `createOpenAIProvider(...)`)                                                   |
| `runner`              | `TaskRunnerProvider`  | Yes      | —                                      | Task runner provider for background processing (e.g., `createPayloadJobsRunner()`)                                  |
| `access`              | `AccessGuard`         | No       | `undefined`                            | Access guard (`{ check }`) for the translation endpoints; omit to leave them open                                   |
| `basePath`            | `string`              | No       | `'/translate'`                         | Base path for all API endpoints                                                                                     |
| `levels`              | `TranslationLevel[]`  | No       | `[documentLevel(), collectionLevel()]` | Which translation surfaces to enable. See [Translation Levels](#translation-levels)                                 |

```typescript
translatorPlugin({
  collections: [Posts, Pages],
  translationProvider: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  runner: createPayloadJobsRunner(),
  access: { check: ({ req }) => req.user?.role === "admin" },
  basePath: "/translate",
});
```

### Translation Levels

_Since v0.5.0._

The `levels` option controls which translation surfaces the plugin exposes. Each entry is a factory you import and list:

- `documentLevel()` — a **Translate** popup on the document edit view (translate one document).
- `collectionLevel()` — a **bulk dashboard** on the collection list view (translate many at once).
- `fieldLevel()` — a synchronous **single-field** endpoint (`POST {basePath}/field`) that translates one field from a chosen source locale, with no persistence. _(Since v0.6.0.)_

`documentLevel` and `collectionLevel` run through the configured `runner` (async Payload Jobs by default, or synchronous via `createSyncRunner()`) and share the same translation REST API. `fieldLevel` is always synchronous and uses no runner.

```typescript
import { translatorPlugin, documentLevel, collectionLevel, createOpenAIProvider, createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

translatorPlugin({
  collections: [Posts],
  translationProvider: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  runner: createPayloadJobsRunner(),
  levels: [collectionLevel()], // bulk dashboard only — no per-document popup
});
```

Omit `levels` for the default `[documentLevel(), collectionLevel()]`, which is identical to the previous behaviour — so adopting this option is non-breaking.

#### Field-level translation

_Since v0.6.0._

`fieldLevel` adds a per-field **Translate** control. Two steps:

1. Add `fieldLevel()` to `levels` (registers the endpoint).
2. Wrap the fields that should get a control with `withFieldTranslation(field)`.

```typescript
import { translatorPlugin, documentLevel, fieldLevel, withFieldTranslation } from "@focus-reactive/payload-plugin-translator";

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

The control is an icon button (rendered just above the input) that opens a compact popup showing the translation **direction** — a source-locale `Select`, an arrow, then the **current locale** (the fixed target): `en → fr`. You pick the **source** locale; the **target is always the locale you're editing**. The server reads the source locale's _saved_ value and translates it into the current locale, so the control needs a **saved document** (it's disabled on new documents). The source defaults to your Payload `defaultLocale` when that isn't the current locale, otherwise you choose it explicitly.

> This is intentionally the reverse of the document/collection level (which translates _from_ the current locale _to_ chosen targets): the field control pulls content _into_ the locale you're standing in.

The translated value is written straight back to form state — no save, no queue — and an **Undo** restores the previous value. Wrapping for a control is allowed on **`text`, `textarea`, and `richText`** fields (a compile error on other types — pass `{ exclude: true }` for those). For `richText` the Lexical editor is re-mounted with the translated content. Fields **inside blocks** are supported too: the server reads the source document's `blockType` to resolve the right block schema. Needs a **saved document** (the source value is read from it), so the control is hidden while creating a new document. The endpoint itself (`POST {basePath}/field`) is also usable directly by custom clients.

> **Localized `blocks`/`array` containers.** Per-field translation works when the **container is not localized** — the block/array structure is then shared across locales and only the leaf values differ per locale (wrap the leaves, not the container). If a `blocks`/`array` field is itself `localized`, each locale has an independent structure (different order/content), so a field inside it can't be matched to the source locale by position — the control no-ops with a notice asking you to translate the whole document instead. (Whole-document translation handles this case by matching elements by `id`.)

### OpenAIProviderConfig

Configuration for `createOpenAIProvider()`.

| Property       | Type                      | Required | Default              | Description                                                                                                            |
| -------------- | ------------------------- | -------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `apiKey`       | `string`                  | Yes      | —                    | OpenAI API key                                                                                                         |
| `model`        | `string \| ChatModel`     | No       | `'gpt-4o'`           | OpenAI model to use for translation                                                                                    |
| `systemPrompt` | `SystemPromptBuilder`     | No       | Built-in prompt      | Custom function to build the system prompt                                                                             |
| `dryRun`       | `boolean \| DryRunConfig` | No       | `false`              | Simulate translations without API calls                                                                                |
| `timeout`      | `number`                  | No       | SDK default (10 min) | Per-request timeout in ms. A job blocks on this call, so the 10-min SDK default is usually too long. _(Since v0.6.0.)_ |
| `maxRetries`   | `number`                  | No       | SDK default (2)      | Max automatic retries on transient errors (429/5xx/network). `0` disables. _(Since v0.6.0.)_                           |

```typescript
createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  systemPrompt: ({ sourceLang, targetLang, defaultPrompt }) => `${defaultPrompt}\nUse formal language. Keep brand names unchanged.`,
  dryRun: false,
});
```

#### SystemPromptBuilder

Function signature for custom system prompt:

```typescript
type SystemPromptBuilder = (context: SystemPromptContext) => string;

type SystemPromptContext = {
  sourceLang: string;
  targetLang: string;
  defaultPrompt: string;
};
```

#### DryRunConfig

When `dryRun` is an object, it allows custom transformation with optional delay:

```typescript
type DryRunTransformer = (text: string) => string | Promise<string>;

type DryRunConfig = {
  transform: DryRunTransformer; // Custom transformer function
  timeout?: number; // Delay in ms (simulates API latency)
};
```

### PayloadJobsRunnerOptions

Configuration for `createPayloadJobsRunner()`.

| Property    | Type                       | Required | Default                            | Description                                             |
| ----------- | -------------------------- | -------- | ---------------------------------- | ------------------------------------------------------- |
| `taskName`  | `string`                   | No       | `'translate_document'`             | Task name in Payload jobs collection                    |
| `queueName` | `string`                   | No       | `'translations'`                   | Queue name for grouping jobs                            |
| `autoRun`   | `false \| { cron, limit }` | No       | `{ cron: '* * * * *', limit: 50 }` | Auto-run config, or `false` to disable (for serverless) |

```typescript
createPayloadJobsRunner({
  taskName: "translate_document",
  queueName: "translations",
  autoRun: {
    cron: "* * * * *",
    limit: 50,
  },
});
```

### FieldTranslationConfig

Configuration for `withFieldTranslation()` helper or `field.custom.translateKit`.

| Property  | Type      | Required | Default | Description                         |
| --------- | --------- | -------- | ------- | ----------------------------------- |
| `exclude` | `boolean` | No       | `false` | Exclude this field from translation |

```typescript
import { withFieldTranslation } from "@focus-reactive/payload-plugin-translator";

withFieldTranslation({ name: "sku", type: "text", localized: true }, { exclude: true });
```

## Translation Strategies

When translating, you can choose how to handle existing translations:

| Strategy          | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `'overwrite'`     | (Default) Replaces all existing translated content with new translations |
| `'skip_existing'` | Only translates fields that are empty in the target locale               |

## Important Notes

### Explicit `localized: true` for nested fields

Payload CMS allows wrapper fields (group, array, blocks, tabs) to be marked as `localized`, which makes nested fields inherit localization without explicit declaration. However, the plugin only translates **leaf fields** (primitive data fields like text, textarea, richText).

For correct plugin operation, you must explicitly set `localized: true` on each nested field you want to translate:

```typescript
// ❌ Won't work — nested title is not explicitly localized
{
  name: 'meta',
  type: 'group',
  localized: true,
  fields: [
    { name: 'title', type: 'text' }
  ]
}

// ✅ Correct — title is explicitly localized
{
  name: 'meta',
  type: 'group',
  localized: true,
  fields: [
    { name: 'title', type: 'text', localized: true }
  ]
}
```

### Excluded fields behavior

Using `withFieldTranslation({ ... }, { exclude: true })` does not mean the field will be completely untouched during translation. If the excluded field is empty in the target locale, it will be populated with data from the source locale.

This prevents validation errors when saving translation results (e.g., required fields that should not be translated but must have a value).

### Field exclusion priority over strategy

`withFieldTranslation` exclusion takes priority over the `overwrite` strategy. Even when using `overwrite` strategy, excluded fields will:

- Keep their target value if it exists
- Copy source value only if target is empty
- Never be sent to the translation provider

### Preserving completed job status

By default, Payload deletes jobs immediately after completion. This means the "Completed" status won't be visible in the UI. To preserve completed jobs and show their status, add this to your Payload config:

```typescript
export default buildConfig({
  // ... other config
  jobs: {
    deleteJobOnComplete: false,
  },
});
```

## Task Runners

### PayloadJobsRunner (Recommended)

Uses Payload's built-in job queue for background processing:

```typescript
import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";

const runner = createPayloadJobsRunner({
  taskName: "translate_document",
  queueName: "translations",
  autoRun: {
    cron: "* * * * *",
    limit: 50,
  },
});
```

### SyncRunner

Executes translations synchronously (useful for development or small datasets):

```typescript
import { createSyncRunner } from "@focus-reactive/payload-plugin-translator";

const runner = createSyncRunner();
```

## Translation Providers

### OpenAI Provider

Built-in provider using OpenAI's API:

```typescript
import { createOpenAIProvider } from "@focus-reactive/payload-plugin-translator";

const provider = createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  systemPrompt: ({ defaultPrompt }) => `${defaultPrompt}\nUse formal language.`,
});
```

### Custom Provider

Create your own translation provider by implementing the `TranslationProvider` interface:

#### TranslationProvider Interface

| Method      | Signature                                                                                                 | Description                                       |
| ----------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `translate` | `(content: TranslationInput, sourceLng: string, targetLng: string) => Promise<TranslationOutput \| null>` | Translates content from source to target language |

**Important:** The numeric indices in `TranslationInput` must be preserved exactly in `TranslationOutput`. Each index maps to a specific field in the document structure, so the provider must return the same keys with translated values.

#### Types

```typescript
// Numeric index representing position in document structure
type TranslationIndex = number;

// Input: Map of numeric indices to text strings
type TranslationInput = Record<TranslationIndex, string>;

// Output: Same indices with translated values
type TranslationOutput = Record<TranslationIndex, string>;
```

#### Example Implementation

```typescript
import type { TranslationProvider, TranslationInput, TranslationOutput } from "@focus-reactive/payload-plugin-translator";

class DeepLProvider implements TranslationProvider {
  constructor(private apiKey: string) {}

  async translate(content: TranslationInput, sourceLng: string, targetLng: string): Promise<TranslationOutput | null> {
    try {
      // content example: { "0": "Hello", "1": "World" }
      const texts = Object.values(content);

      const response = await fetch("https://api.deepl.com/v2/translate", {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: texts,
          source_lang: sourceLng.toUpperCase(),
          target_lang: targetLng.toUpperCase(),
        }),
      });

      const data = await response.json();

      // Reconstruct the result with same keys
      const result: TranslationOutput = {};
      Object.keys(content).forEach((key, index) => {
        result[key] = data.translations[index].text;
      });

      return result;
    } catch {
      return null;
    }
  }
}

// Usage
translatorPlugin({
  collections: [Posts],
  translationProvider: new DeepLProvider(process.env.DEEPL_API_KEY),
  runner: createPayloadJobsRunner(),
});
```

## UI Components

The plugin automatically adds:

1. **Document Translation Panel** — Available in the document edit view sidebar
2. **Bulk Translation Dashboard** — Accessible from collection list view
3. **Translation Progress Indicator** — Shows real-time translation status

## TypeScript

All types are exported for TypeScript users:

```typescript
import type {
  // Plugin config
  TranslatorPluginConfig,

  // Provider types
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
  OpenAIProviderConfig,
  DryRunConfig,

  // Runner types
  TaskRunnerProvider,
  PayloadJobsRunnerOptions,

  // Strategy types
  TranslationStrategy,

  // Access control
  AccessGuard,
  AccessGuardRequest,

  // Field config
  FieldTranslationConfig,

  // Translation levels
  TranslationLevel,
} from "@focus-reactive/payload-plugin-translator";
```

## Roadmap

Planned features for future releases:

- **Field-level translation** — Granular translation control allowing users to translate individual fields rather than entire documents
- **Global translation dashboard** — Translate all collections at once from a single interface, with progress tracking across the entire CMS
- **Vercel Cron Jobs runner** — Built-in runner for seamless Vercel/serverless deployments without manual API route configuration
- Auto-translate on source change — Automatically trigger translation when the default locale content is updated
