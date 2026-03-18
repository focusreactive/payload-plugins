# @focus-reactive/payload-plugin-comments

[![npm](https://img.shields.io/npm/v/@focus-reactive/payload-plugin-comments)](https://www.npmjs.com/package/@focus-reactive/payload-plugin-comments)


A collaborative commenting plugin for [Payload CMS](https://payloadcms.com/) v3. Adds a full-featured comments system to the Payload admin panel — supporting document-level and field-level comments on both collections and globals, @mentions with email notifications, comment resolution, multi-tenancy, and locale-aware filtering.

## Table of Contents

- [AI Integration Prompt](#ai-integration-prompt)
- [UI Screenshots](#ui-screenshots)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup](#setup)
- [Configuration](#configuration)
- [Translations](#translations)
- [Environment Variables](#environment-variables)
- [Architecture Overview](#architecture-overview)
- [Exports Reference](#exports-reference)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)

---

## AI Integration Prompt

> Copy and paste this prompt into your AI assistant (Cursor, Claude, etc.) to integrate the plugin into an existing Payload v3 project.

```
I want to add a collaborative commenting system to my Payload CMS v3 project using @focus-reactive/payload-plugin-comments.

## How it works

The plugin injects into every collection and global:
- A field-level comment badge on every field label — shows comment count, opens a popup to post
- A document-level comments drawer (sidebar) scoped to the current document
- A global comments panel (header button) listing all comments across every document and global

Comments are stored in an auto-generated `comments` collection (hidden from the sidebar). Each comment records:
- documentId / collectionSlug / globalSlug — what it belongs to
- fieldPath — dot-notation field path (null = document-level)
- locale — for field-level comments (null = shown in all locales)
- text — may contain @(userId) mention tokens
- author, mentions, isResolved, resolvedBy, resolvedAt
- tenant (optional, when multi-tenancy is enabled)

@mentions use autocomplete from the users collection. Mentioned users receive email notifications via Resend.
Comments are automatically deleted when their parent document is deleted.

## Installation

pnpm add @focus-reactive/payload-plugin-comments

## Step 1 — Register the plugin in payload.config.ts

import { buildConfig } from 'payload'
import { commentsPlugin } from '@focus-reactive/payload-plugin-comments'

export default buildConfig({
  plugins: [
    commentsPlugin({
      // Optional: specify which field to use as document title in the UI
      collections: [
        { slug: 'pages', titleField: 'title' },
        { slug: 'products', titleField: 'name' },
      ],
      // Optional: customize the display name field on users
      usernameFieldPath: 'name', // default
    }),
  ],
})

## Step 2 — Import the stylesheet

In your global CSS or admin layout:

@import "@focus-reactive/payload-plugin-comments/styles.css";

Or in a TypeScript/JS file:

import "@focus-reactive/payload-plugin-comments/styles.css";

## Step 3 — Regenerate the import map

Run this after adding the plugin so Payload registers the plugin's admin components:

npx payload generate:importmap

(Or the equivalent for your package manager: pnpm payload generate:importmap / bunx payload generate:importmap)
If you skip this step the comment badges, drawer, and header button will not appear in the admin UI.

## Step 4 — Create and run a migration (SQL adapters only)

The plugin adds a `comments` collection to your database. If you use PostgreSQL or SQLite, create and apply a migration:

npx payload migrate:create create_comments
npx payload migrate

Skip this step if you use the MongoDB adapter.

## Optional: Multi-tenancy

commentsPlugin({
  tenant: {
    enabled: true,
    collectionSlug: 'tenants',       // default
    documentTenantField: 'tenant',   // default
  },
})

## Optional: Collection overrides

commentsPlugin({
  overrides: {
    access: { /* custom access control */ },
    fields: (defaultFields) => [...defaultFields],
    hooks: {
      afterChange: [async ({ doc }) => { /* ... */ }],
    },
  },
})

## Environment variables (for email notifications)

RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=comments@yourdomain.com

## Important notes

- All collections and globals automatically get field-level comments — `collections` config only sets UI metadata (titleField).
- Comments on globals use globalSlug instead of collectionSlug/documentId.
- Field-level comments are locale-scoped; document-level comments show in all locales.
- The `comments` collection is hidden from the admin sidebar by default.
- Auto-cleanup: when a document is deleted, all its comments are deleted too.
- usernameFieldPath supports dot-notation (e.g. "profile.displayName").
- If RESEND_FROM_EMAIL is not set, mention emails are silently skipped.
```

---

## UI Screenshots

### Global Comments Panel

A header button in the Payload admin opens a drawer listing all comments across every document and collection.

![Global comments panel](https://github.com/user-attachments/assets/ff1dd13c-42a8-4434-825f-8903e75d840c)

### Document Comments Panel

When viewing a document, a side panel shows all comments scoped to that document with filter tabs (Open / Resolved / Mentioned me).

![Document comments panel](https://github.com/user-attachments/assets/3525ff5e-eb80-48dc-936e-0da3b317ffbb)

### Field Comment Popup

Clicking the comment badge on a field label opens a popup where you can write and post a new comment for that specific field.

![Field comment popup](https://github.com/user-attachments/assets/259c7dc6-5b0e-4bcd-9d49-b7e520682f01)

### Field Label Button — Two States

The comment button embedded in the field label has two visual states: no comments (inactive, appears on hover) and one or more open comments (active, showing the count badge).

| Inactive (no comments)                                                                                            | Active (has comments)                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| ![Field label button — inactive](https://github.com/user-attachments/assets/f540d6a4-c4e9-473f-883c-c34803da4d2f) | ![Field label button — active](https://github.com/user-attachments/assets/dcfbe20e-7b6e-4fa4-9d30-a0e8bd44b7c0) |
|  |

---

## Features

- **Document-level comments** — Leave comments on any document in any collection or global
- **Field-level comments** — Comment directly on individual fields; the field label shows a badge with the comment count
- **Global support** — Field-level and document-level comments work on Payload Globals, not just collections
- **@mention users** — Mention other users in comments using `@name` autocomplete
- **Email notifications** — Mentioned users receive email notifications via [Resend](https://resend.com/)
- **Resolve comments** — Mark comments as resolved/unresolved; filter by open, resolved, or mentioned
- **Global comments panel** — A header button opens a drawer showing all comments across all documents and globals
- **Optimistic UI** — Comments appear instantly before the server confirms
- **Multi-tenancy** — Scope comments to tenants via `@payloadcms/plugin-multi-tenant`
- **Locale-aware** — Field-level comments are tied to a locale; document-level comments are shown in all locales
- **Auto-cleanup** — Comments are automatically deleted when their parent document is deleted
- **i18n / Translations** — All UI strings are translatable; ship your own locale overrides alongside the built-in English defaults

---

## Prerequisites

- Node.js 20 or higher
- A working [Payload CMS v3](https://payloadcms.com/docs/getting-started/installation) project with Next.js
- pnpm (recommended)
- A [Resend](https://resend.com/) account (required only for mention email notifications)

---

## Installation

```bash
pnpm add @focus-reactive/payload-plugin-comments
```

```bash
npm install @focus-reactive/payload-plugin-comments
# or
yarn add @focus-reactive/payload-plugin-comments
```

**Peer dependencies:** `payload ^3.0.0`, `@payloadcms/ui ^3.0.0`. `next ^14 || ^15`, `react ^18 || ^19`, `react-dom`, and `@payloadcms/plugin-multi-tenant` are optional.

---

## Setup

### 1. Add the plugin to your Payload config

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";

export default buildConfig({
  plugins: [
    commentsPlugin({
      // Optional: customize which field is used as the document title in the UI
      collections: [
        { slug: "pages", titleField: "title" },
        { slug: "products", titleField: "name" },
      ],
    }),
  ],
  // ... rest of your config
});
```

### 2. Import the styles

Add the plugin's stylesheet to your global CSS or admin layout:

```css
/* global CSS */
@import "@focus-reactive/payload-plugin-comments/styles.css";
```

Or import it in a layout/page file:

```ts
import "@focus-reactive/payload-plugin-comments/styles.css";
```

### 3. Regenerate the import map

Payload needs its import map regenerated whenever you add or remove a plugin that registers admin components. Run:

```bash
npx payload generate:importmap
```

This command works regardless of your package manager (`npm`, `pnpm`, `yarn`, `bun`). Alternatively use the equivalent for your package manager:

```bash
pnpm payload generate:importmap
# yarn payload generate:importmap
# bunx payload generate:importmap
```

If you skip this step the plugin's admin components (comment badges, drawer, header button) will not appear in the Payload admin UI.

### 4. Create and run a migration

The plugin adds a `comments` collection to your database. If you use a SQL adapter (PostgreSQL, SQLite), create and apply a migration:

```bash
npx payload migrate:create create_comments
npx payload migrate
```

Skip this step if you use the MongoDB adapter — Payload creates collections automatically.

---

## Configuration

The `commentsPlugin` factory accepts an optional `CommentsPluginConfig` object:

```ts
commentsPlugin(config?: CommentsPluginConfig)
```

### `CommentsPluginConfig`

| Option              | Type                  | Default  | Description                                                                         |
| ------------------- | --------------------- | -------- | ----------------------------------------------------------------------------------- |
| `collections`       | `CollectionEntry[]`   | —        | UI metadata for collections (title field). All collections get comments regardless. |
| `enabled`           | `boolean`             | `true`   | Set to `false` to disable the plugin entirely                                       |
| `tenant`            | `TenantPluginConfig`  | —        | Multi-tenancy settings (see below)                                                  |
| `overrides`         | `CollectionOverrides` | —        | Customize the generated `comments` collection                                       |
| `translations`      | `Translations`        | —        | Override UI strings per locale (see below)                                          |
| `usernameFieldPath` | `string`              | `"name"` | Dot-notation path to the display name field on the users collection                 |

### `CollectionEntry`

Each entry in `collections` is an object that provides UI metadata for a specific collection:

```ts
interface CollectionEntry {
  slug: string;
  titleField?: string; // Field used as document title in the UI. Default: "id"
}
```

> **Note:** You do not need to list every collection. All collections (and all globals) automatically support comments. The `collections` array only sets display metadata like the title field.

**Examples:**

```ts
commentsPlugin({
  collections: [
    { slug: "pages", titleField: "title" },
    { slug: "products", titleField: "name" },
  ],
});
```

### `usernameFieldPath`

Specifies which field on the `users` collection is used as the display name in comment UI and @mention autocomplete. Supports dot-notation for nested fields.

```ts
commentsPlugin({
  usernameFieldPath: "name", // default
  // usernameFieldPath: "firstName",
  // usernameFieldPath: "profile.displayName",
});
```

### `TenantPluginConfig`

Configure multi-tenancy when using `@payloadcms/plugin-multi-tenant`:

| Option                | Type      | Default     | Description                                                   |
| --------------------- | --------- | ----------- | ------------------------------------------------------------- |
| `enabled`             | `boolean` | `false`     | Enable tenant scoping                                         |
| `collectionSlug`      | `string`  | `"tenants"` | Slug of the tenants collection                                |
| `documentTenantField` | `string`  | `"tenant"`  | Field on document collections that holds the tenant reference |

**Example:**

```ts
commentsPlugin({
  tenant: {
    enabled: true,
    collectionSlug: "tenants",
    documentTenantField: "tenant",
  },
});
```

### Collection Overrides

Use `overrides` to customize the generated `comments` collection — for example, to extend access control or add custom fields:

```ts
commentsPlugin({
  overrides: {
    access: {
      // Override the default "authenticated only" access
    },
    fields: (defaultFields) => [...defaultFields],
    hooks: {
      afterChange: [
        async ({ doc }) => {
          console.log("Comment changed:", doc.id);
        },
      ],
    },
  },
});
```

---

## Translations

Use `translations` to override any UI string for one or more locales. Each key is a locale code; the value is a partial object of the `CommentsTranslations` shape — keys you omit fall back to the built-in English defaults.

```ts
commentsPlugin({
  translations: {
    fr: {
      label: "Commentaires",
      add: "Ajouter un commentaire",
      writeComment: "Écrire un commentaire",
      comment: "Commenter",
      cancel: "Annuler",
      resolve: "Résoudre",
      reopen: "Rouvrir",
      delete: "Supprimer",
      filterOpen: "Ouverts",
      filterResolved: "Résolus",
      filterMentioned: "Me mentionnent",
    },
  },
});
```

All translatable keys (with their English defaults):

| Key                   | Default (English)              |
| --------------------- | ------------------------------ |
| `label`               | `"Comments"`                   |
| `openComments_one`    | `"{{count}} open comment"`     |
| `openComments_other`  | `"{{count}} open comments"`    |
| `add`                 | `"Add comment"`                |
| `writeComment`        | `"Write a comment"`            |
| `comment`             | `"Comment"`                    |
| `cancel`              | `"Cancel"`                     |
| `posting`             | `"Posting…"`                   |
| `resolve`             | `"Resolve"`                    |
| `reopen`              | `"Reopen"`                     |
| `delete`              | `"Delete"`                     |
| `general`             | `"General"`                    |
| `close`               | `"Close"`                      |
| `syncingComments`     | `"Syncing comments"`           |
| `openCommentsAria`    | `"Open comments"`              |
| `failedToPost`        | `"Failed to post comment"`     |
| `failedToUpdate`      | `"Failed to update comment"`   |
| `failedToDelete`      | `"Failed to delete comment"`   |
| `failedToAdd`         | `"Failed to add comment"`      |
| `unknownAuthor`       | `"Unknown"`                    |
| `deletedUser`         | `"Deleted user"`               |
| `noOpenComments`      | `"No open comments"`           |
| `noResolvedComments`  | `"No resolved comments"`       |
| `noMentionedComments` | `"No comments mentioning you"` |
| `filterOpen`          | `"Open"`                       |
| `filterResolved`      | `"Resolved"`                   |
| `filterMentioned`     | `"Mentioned me"`               |
| `noMentionMatches`    | `"No matches"`                 |

The `CommentsTranslations` type is exported from the package so you can type your translation objects:

```ts
import type { CommentsTranslations } from "@focus-reactive/payload-plugin-comments";

const myTranslations: Record<string, Partial<CommentsTranslations>> = {
  fr: { label: "Commentaires" },
  de: { label: "Kommentare" },
};

commentsPlugin({ translations: myTranslations });
```

---

## Environment Variables

### Required for email notifications

| Variable            | Description                                    | Example                   |
| ------------------- | ---------------------------------------------- | ------------------------- |
| `RESEND_API_KEY`    | Your Resend API key                            | `re_xxxxxxxxxxxxxxxx`     |
| `RESEND_FROM_EMAIL` | Sender email address for mention notifications | `comments@yourdomain.com` |

If `RESEND_FROM_EMAIL` is not set, mention email notifications are silently skipped and an error is logged to the console.

**.env.local example:**

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=comments@yourdomain.com
```

---

## Architecture Overview

### How It Works

**Plugin initialization** (`plugin.ts`):

1. The plugin receives a `CommentsPluginConfig` and returns a standard Payload `Plugin` function.
2. It creates a `comments` collection (hidden from the admin sidebar by default).
3. It patches **every collection** to inject `FieldCommentLabel` into each field's admin label and registers an `afterDelete` hook that cascade-deletes comments when a document is removed.
4. It patches **every global** to inject `FieldCommentLabel` into each field's admin label.
5. It registers two admin providers (`CommentsProviderWrapper`, `GlobalCommentsLoader`) and one admin action (`CommentsHeaderButton`).

**Data loading** (`GlobalCommentsLoader`):

- This server component runs on every admin page load.
- It fetches all comments, document titles, mentionable users, field labels, collection labels, and global labels in parallel.
- Results are passed to `GlobalCommentsHydrator` (a client component) which hydrates the `CommentsContext`.

**State management** (`CommentsProvider`):

- Holds `allComments` in React state with optimistic updates via `useOptimistic`.
- `visibleComments` is derived: filtered to the current document/collection/global/locale based on the Next.js `pathname`.
- Exposes `addComment`, `removeComment`, `resolveComment`, and `syncComments` mutations.

**Field-level comments** (`FieldCommentLabel`):

- The plugin overrides the `Label` component for every named field in every configured collection and global.
- The label reads comments from context and filters by field path, showing a badge with the count.
- Clicking the badge opens the comments drawer pre-scrolled to that field's comment group.

**Comments collection schema:**

| Field            | Type                    | Description                                                        |
| ---------------- | ----------------------- | ------------------------------------------------------------------ |
| `documentId`     | number                  | ID of the document being commented on (null for globals)           |
| `collectionSlug` | text                    | Slug of the collection (null for global comments)                  |
| `globalSlug`     | text                    | Slug of the Payload global (null for collection document comments) |
| `fieldPath`      | text                    | Dot-notation path of the field (null = document-level)             |
| `locale`         | text                    | Locale of the comment (null = shown in all locales)                |
| `text`           | textarea                | Comment body (may contain `@(userId)` mention tokens)              |
| `mentions`       | array → relationship    | Users mentioned in this comment                                    |
| `author`         | relationship → users    | Comment author (set automatically)                                 |
| `isResolved`     | checkbox                | Whether the comment is resolved                                    |
| `resolvedBy`     | relationship → users    | Who resolved it                                                    |
| `resolvedAt`     | date                    | When it was resolved                                               |
| `tenant`         | relationship (optional) | Tenant scope (when multi-tenancy is enabled)                       |

---

## Exports Reference

| Import path                                          | Exports                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `@focus-reactive/payload-plugin-comments`            | `commentsPlugin`, `CommentsPluginConfig` (type), `CommentsTranslations` (type), `setPayloadConfig` |
| `@focus-reactive/payload-plugin-comments/styles.css` | Plugin stylesheet (Tailwind-compiled CSS)                                                          |

---

## Available Scripts

Run these from the project root with `pnpm`:

| Command             | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `pnpm build`        | Build the plugin to `dist/` (tsup + Tailwind CSS minification) |
| `pnpm dev`          | Build in watch mode — rebuilds on file changes                 |
| `pnpm lint`         | Run ESLint on `src/`                                           |
| `pnpm lint:fix`     | Run ESLint with auto-fix                                       |
| `pnpm format`       | Format `src/` with Prettier                                    |
| `pnpm format:check` | Check formatting without writing                               |

---

## Contributing

1. Fork the repository and create a feature branch.
2. Install dependencies: `pnpm install`
3. Start the build watcher: `pnpm dev`
4. Make your changes in `src/`.
5. Run `pnpm lint` and `pnpm format:check` before submitting.
6. Open a pull request against `main`.

---

## License

MIT © [Focus Reactive](https://focusreactive.com/)
