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
import {
  translatorPlugin,
  createOpenAIProvider,
  createPayloadJobsRunner,
} from "@focus-reactive/payload-plugin-translator";
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

| Property              | Type                  | Required | Default        | Description                                                                                                         |
| --------------------- | --------------------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `collections`         | `CollectionConfig[]`  | Yes      | —              | Original collection configs to enable translation for. Must be the same objects passed to `buildConfig`, not slugs. |
| `translationProvider` | `TranslationProvider` | Yes      | —              | Translation provider instance (e.g., `createOpenAIProvider(...)`)                                                   |
| `runner`              | `TaskRunnerProvider`  | Yes      | —              | Task runner provider for background processing (e.g., `createPayloadJobsRunner()`)                                  |
| `access`              | `AccessGuard`         | No       | `undefined`    | Access control function for translation endpoints                                                                   |
| `basePath`            | `string`              | No       | `'/translate'` | Base path for all API endpoints                                                                                     |

```typescript
translatorPlugin({
  collections: [Posts, Pages],
  translationProvider: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  runner: createPayloadJobsRunner(),
  access: async ({ req }) => req.user?.role === "admin",
  basePath: "/translate",
});
```

### OpenAIProviderConfig

Configuration for `createOpenAIProvider()`.

| Property       | Type                      | Required | Default         | Description                                |
| -------------- | ------------------------- | -------- | --------------- | ------------------------------------------ |
| `apiKey`       | `string`                  | Yes      | —               | OpenAI API key                             |
| `model`        | `string \| ChatModel`     | No       | `'gpt-4o'`      | OpenAI model to use for translation        |
| `systemPrompt` | `SystemPromptBuilder`     | No       | Built-in prompt | Custom function to build the system prompt |
| `dryRun`       | `boolean \| DryRunConfig` | No       | `false`         | Simulate translations without API calls    |

```typescript
createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  systemPrompt: ({ sourceLang, targetLang, defaultPrompt }) =>
    `${defaultPrompt}\nUse formal language. Keep brand names unchanged.`,
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

withFieldTranslation(
  { name: "sku", type: "text", localized: true },
  { exclude: true },
);
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
import type {
  TranslationProvider,
  TranslationInput,
  TranslationOutput,
} from "@focus-reactive/payload-plugin-translator";

class DeepLProvider implements TranslationProvider {
  constructor(private apiKey: string) {}

  async translate(
    content: TranslationInput,
    sourceLng: string,
    targetLng: string,
  ): Promise<TranslationOutput | null> {
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
} from "@focus-reactive/payload-plugin-translator";
```

## Roadmap

Planned features for future releases:

- **Field-level translation** — Granular translation control allowing users to translate individual fields rather than entire documents
- **Global translation dashboard** — Translate all collections at once from a single interface, with progress tracking across the entire CMS
- **Vercel Cron Jobs runner** — Built-in runner for seamless Vercel/serverless deployments without manual API route configuration
- Auto-translate on source change — Automatically trigger translation when the default locale content is updated
