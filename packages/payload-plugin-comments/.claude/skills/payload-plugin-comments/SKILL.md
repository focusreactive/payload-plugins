---
name: payload-plugin-comments
description: >
  Use this skill for anything involving the payload-plugin-comments Payload CMS plugin.
  Triggers include: installing payload-plugin-comments, configuring its options, asking
  what it does, troubleshooting errors, upgrading versions, writing collections or fields
  that use it, and answering questions about its API. If the user mentions
  "payload-plugin-comments", "comments plugin", "field-level comments", "document comments",
  or "@mention" in any Payload CMS context, always use this skill.
---

# payload-plugin-comments

> Adds field-level and document-level commenting to the Payload CMS admin UI, with @mention notifications, comment resolution, and multi-tenancy support.

**Source**: [github.com/focusreactive/payload-plugins](https://github.com/focusreactive/payload-plugins)
**npm**: `@focus-reactive/payload-plugin-comments`
**Payload versions**: 3.x

---

## Quick Start

### 1. Installation

```bash
pnpm add @focus-reactive/payload-plugin-comments
# or
npm install @focus-reactive/payload-plugin-comments
```

**Peer dependencies:** `payload ^3.0.0`, `@payloadcms/ui ^3.0.0`. `next ^14 || ^15`, `react ^18 || ^19`, `react-dom`, and `@payloadcms/plugin-multi-tenant` are optional.

### 2. Register the plugin

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

### 3. Regenerate the import map

```bash
npx payload generate:importmap
# or: pnpm payload generate:importmap / bunx payload generate:importmap
```

If you skip this step, comment badges, the drawer, and the header button will not appear in the admin UI.

### 4. SQL adapters only — run a migration

```bash
npx payload migrate:create create_comments
npx payload migrate
```

Skip if you use the MongoDB adapter.

### 5. Optional: email notifications

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=comments@yourdomain.com
```

If these are not set, mentions work in the UI but emails are silently skipped.

---

## Configuration Reference

| Option              | Type                  | Default  | Description                                                 |
| ------------------- | --------------------- | -------- | ----------------------------------------------------------- |
| `enabled`           | `boolean`             | `true`   | Enable/disable the plugin entirely                          |
| `collections`       | `CollectionEntry[]`   | `[]`     | UI metadata per collection (see below)                      |
| `usernameFieldPath` | `string`              | `"name"` | Dot-notation path to display name on the users collection   |
| `tenant`            | `TenantPluginConfig`  | —        | Multi-tenancy scoping (see below)                           |
| `overrides`         | `CollectionOverrides` | —        | Custom access, hooks, or fields for the comments collection |
| `translations`      | `Translations`        | —        | Per-locale UI string overrides                              |

### CollectionEntry

```ts
interface CollectionEntry {
  slug: string; // Collection slug
  titleField?: string; // Field to show as document title in comments UI (default: "id")
}
```

**Important:** You do **not** need to list every collection here. All collections automatically get comment badges. This array only controls UI metadata.

### TenantPluginConfig

```ts
interface TenantPluginConfig {
  enabled?: boolean; // default: false
  collectionSlug?: string; // tenants collection slug (default: "tenants")
  documentTenantField?: string; // field on documents holding tenant ref (default: "tenant")
}
```

---

## What the Plugin Adds

1. **`comments` collection** — Hidden from admin sidebar. Stores all comments with fields: `documentId`, `collectionSlug`, `globalSlug`, `fieldPath`, `locale`, `text`, `mentions`, `author`, `isResolved`, `resolvedBy`, `resolvedAt`.
2. **Field comment badges** — Every labeled field across all collections and globals automatically gets a `FieldCommentLabel` component injected showing the open comment count. Click to open a comment popup for that field.
3. **Header button** — A `CommentsHeaderButton` is added to the admin header. Opens a global drawer showing all comments across all documents and globals, filterable by open/resolved/mentioned.
4. **Cascade delete** — When a document is deleted, all its comments are automatically removed.
5. **@mention autocomplete** — Type `@` in a comment to mention users. Sends email via Resend.
6. **Comment resolution** — Comments can be marked resolved/reopened, recording who resolved them and when.

---

## Usage Patterns

### Customising the user display name

If your users collection has the name in a nested field:

```ts
commentsPlugin({
  usernameFieldPath: "profile.displayName",
});
```

### Overriding access control

```ts
commentsPlugin({
  overrides: {
    access: {
      read: ({ req }) => req.user?.role === "admin",
    },
  },
});
```

### Adding extra fields to the comments collection

```ts
commentsPlugin({
  overrides: {
    fields: (defaultFields) => [
      ...defaultFields,
      {
        name: "category",
        type: "select",
        options: ["bug", "suggestion", "question"],
      },
    ],
  },
});
```

### Multi-tenancy integration

Use together with `@payloadcms/plugin-multi-tenant`:

```ts
plugins: [
  multiTenantPlugin({ ... }),
  commentsPlugin({
    tenant: {
      enabled: true,
      collectionSlug: "tenants",
      documentTenantField: "tenant",
    },
  }),
]
```

### Translations

```ts
commentsPlugin({
  translations: {
    fr: {
      label: "Commentaires",
      add: "Ajouter un commentaire",
      comment: "Commenter",
      resolve: "Résoudre",
    },
  },
});
```

---

## Pitfalls

- **Styles must be imported manually** — The plugin does not auto-inject CSS. If you forget `styles.css`, the UI will be unstyled.
- **Import map must be regenerated** — Run `payload generate:importmap` after adding the plugin. Without it, comment badges, the drawer, and the header button will not appear.
- **`collections` array is optional** — Omitting it is valid; comments still work on all collections. The array only sets `titleField` for the UI.
- **`usernameFieldPath` must match your users schema** — Default is `"name"`. If your users collection stores display names differently, set this explicitly.
- **Email notifications require both env vars** — If only one of `RESEND_API_KEY` / `RESEND_FROM_EMAIL` is set, emails fail silently with a console error.
- **SQL adapters need a migration** — After adding the plugin, run `payload migrate:create` and `payload migrate` to create the `comments` table.

---

## FAQ

**Q: Do I need to list every collection in the `collections` array?**
A: No. All collections and globals get comment badges automatically. The `collections` array only adds per-collection UI metadata (`titleField`).

**Q: Can I comment on Payload globals?**
A: Yes. Globals are supported. Field-level badges are injected into globals the same way as collections.

**Q: Where are comments stored?**
A: In a `comments` collection that the plugin creates automatically, hidden from the admin sidebar.

**Q: How do @mentions work?**
A: Type `@` in the comment editor to trigger an autocomplete dropdown. Selecting a user inserts a `@(userId)` token. On save, the plugin sends an email via Resend to the mentioned user.

**Q: What happens to comments when a document is deleted?**
A: Comments are cascade-deleted via an `afterDelete` hook on the parent collection.

**Q: Can I filter comments?**
A: The global header panel supports three filters: Open, Resolved, and Mentioned me.

## Further Reading

- Working examples → `./examples.md`
