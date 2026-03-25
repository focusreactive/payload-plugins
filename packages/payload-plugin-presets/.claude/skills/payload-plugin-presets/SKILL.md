---
name: payload-plugin-presets
description: >
  Use this skill for anything involving the payload-plugin-presets Payload CMS plugin.
  Triggers include: installing payload-plugin-presets, configuring its options, asking
  what it does, troubleshooting errors, upgrading versions, writing blocks or fields that
  use it, and answering questions about its API. If the user mentions
  "payload-plugin-presets", "presets plugin", "block presets", "reusable presets",
  "save preset", or "apply preset" in any Payload CMS context, always use this skill.
---

# payload-plugin-presets

> Adds reusable block preset management to the Payload CMS admin UI — save a block's configuration as a named preset, then apply it to any block of the same type with one click.

**Source**: [github.com/focusreactive/payload-plugins](https://github.com/focusreactive/payload-plugins)
**npm**: `@focus-reactive/payload-plugin-presets`
**Payload versions**: 3.x

---

## Quick Start

### 1. Installation

```bash
pnpm add @focus-reactive/payload-plugin-presets
# or
npm install @focus-reactive/payload-plugin-presets
```

**Peer dependencies:** `payload ^3.0.0`, `@payloadcms/ui ^3.0.0`, `next ^14 || ^15`, `react ^18 || ^19`, `react-dom`.

### 2. Register the plugin

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { heroFields } from "@/fields/heroFields";

export default buildConfig({
  plugins: [
    presetsPlugin({
      presetTypes: [
        {
          value: "hero", // Must match block slug exactly
          label: { en: "Hero", es: "Hero" },
          fields: heroFields,
        },
      ],
    }),
  ],
  // ... rest of your config
});
```

### 3. Add Save/Apply buttons to each block

```ts
// blocks/Hero/config.ts
import type { Block } from "payload";
import { createPresetActionsField } from "@focus-reactive/payload-plugin-presets";
import { heroFields } from "@/fields/heroFields";

export const HeroBlock: Block = {
  slug: "hero",
  fields: [...heroFields, createPresetActionsField()],
};
```

### 4. Enable preset selection in a blocks field

```ts
// collections/Page.ts
import { getBlocksFieldWithPresetsPath } from "@focus-reactive/payload-plugin-presets";

export const Page: CollectionConfig = {
  slug: "page",
  fields: [
    {
      name: "blocks",
      type: "blocks",
      blocks: [HeroBlock, ContentBlock],
      admin: {
        components: {
          Field: getBlocksFieldWithPresetsPath(),
        },
      },
    },
  ],
};
```

### 5. Regenerate the import map

```bash
npx payload generate:importmap
# or: pnpm payload generate:importmap / bunx payload generate:importmap
```

If you skip this step, preset action buttons and the custom blocks drawer will not appear in the admin UI.

### 6. SQL adapters only — run a migration

```bash
npx payload migrate:create create_presets
npx payload migrate
```

Skip if you use the MongoDB adapter.

---

## Configuration Reference

| Option            | Type           | Default                                    | Description                                               |
| ----------------- | -------------- | ------------------------------------------ | --------------------------------------------------------- |
| `presetTypes`     | `PresetType[]` | **required**                               | Array of preset type definitions                          |
| `enabled`         | `boolean`      | `true`                                     | Enable/disable the plugin entirely                        |
| `slug`            | `string`       | `'presets'`                                | Collection slug for presets storage                       |
| `labels`          | `object`       | —                                          | Collection labels (singular/plural, supports i18n)        |
| `mediaCollection` | `string`       | `'media'`                                  | Media collection slug for preview images                  |
| `packageName`     | `string`       | `'@focus-reactive/payload-plugin-presets'` | Override for component resolution (local dev only)        |
| `overrides`       | `object`       | —                                          | Custom access, hooks, fields, or admin for the collection |

### PresetType

```ts
interface PresetType {
  value: string; // Unique identifier — MUST match the block's slug exactly
  label: string | { en: string; es?: string }; // Display label (supports i18n)
  fields: Field[]; // Same fields as the block (used for the preset editor form)
}
```

### overrides

```ts
overrides?: {
  access?: {
    create?: Access;
    read?: Access;
    update?: Access;
    delete?: Access;
  };
  fields?: (defaultFields: Field[]) => Field[];  // Extend default preset fields
  hooks?: CollectionConfig['hooks'];
  admin?: Partial<CollectionConfig['admin']>;
}
```

---

## What the Plugin Adds

1. **`presets` collection** — Stores all saved presets. Visible in admin sidebar. Default fields: `name` (text, localized), `preview` (upload), `type` (select), plus one conditional group per preset type.
2. **`createPresetActionsField()`** — A UI-only field that renders **Save** and **Apply** buttons inside a block. Add it to each block you want to support presets.
3. **`getBlocksFieldWithPresetsPath()`** — Replaces the default blocks field component with one that shows a preset picker in the blocks drawer. Apply it to any `type: "blocks"` field.
4. **Preview images** — Each preset can have an optional preview image (from the `media` collection) shown in the blocks drawer.
5. **Auto key stripping** — Internal Payload keys (`id`, `blockType`, `blockName`, `experiment`) are automatically excluded when saving a preset.

---

## Usage Patterns

### Sharing fields between block and preset type

Extract fields to a shared file so the block and the plugin config stay in sync:

```ts
// fields/heroFields.ts
export const heroFields: Field[] = [
  { name: "title", type: "text", required: true },
  { name: "subtitle", type: "textarea" },
  { name: "image", type: "upload", relationTo: "media" },
];

// blocks/Hero/config.ts
export const HeroBlock: Block = {
  slug: "hero",
  fields: [...heroFields, createPresetActionsField()],
};

// payload.config.ts
presetsPlugin({
  presetTypes: [{ value: "hero", label: "Hero", fields: heroFields }],
});
```

### Overriding access control

```ts
presetsPlugin({
  presetTypes: [...],
  overrides: {
    access: {
      read: ({ req }) => !!req.user,
      delete: ({ req }) => req.user?.role === "admin",
    },
  },
});
```

### Adding extra fields to the presets collection

```ts
presetsPlugin({
  presetTypes: [...],
  overrides: {
    fields: (defaultFields) => [
      ...defaultFields,
      { name: "tags", type: "array", fields: [{ name: "tag", type: "text" }] },
    ],
  },
});
```

### Custom collection slug and labels

```ts
presetsPlugin({
  presetTypes: [...],
  slug: "block-templates",
  labels: {
    singular: { en: "Template", es: "Plantilla" },
    plural: { en: "Templates", es: "Plantillas" },
  },
});
```

---

## Pitfalls

- **`presetTypes[].value` must match block slug exactly** — This is what the plugin uses to detect which preset type to save, filter in the drawer, and apply. A mismatch means presets won't appear or apply for that block.
- **`fields` in `presetTypes` must match the block's fields** — These fields define the editor form inside the presets collection. If they diverge from the block's actual fields, saved presets may apply incorrectly.
- **Import map must be regenerated** — Run `payload generate:importmap` after adding the plugin. Without it, Save/Apply buttons and the custom blocks drawer won't appear.
- **`createPresetActionsField()` must be added to each block** — The plugin doesn't inject Save/Apply buttons automatically. You must add the field to every block that should support presets.
- **`getBlocksFieldWithPresetsPath()` must be set on each blocks field** — The enhanced drawer is opt-in. Set it on the `admin.components.Field` of each `type: "blocks"` field.
- **SQL adapters need a migration** — After adding the plugin, run `payload migrate:create` and `payload migrate` to create the `presets` table.
- **`packageName` is for local development only** — Only set this if you're developing the plugin locally without it published to npm.

---

## FAQ

**Q: Do I need to list every block in `presetTypes`?**
A: No — only blocks you want preset support for. Blocks without a matching `presetType` simply won't have presets available.

**Q: Where are presets stored?**
A: In a `presets` collection (configurable via `slug`) that the plugin creates automatically.

**Q: Can I use preview images?**
A: Yes. The preset editor has an optional `preview` upload field. Set `mediaCollection` if your media collection has a non-default slug. Preview images appear in the blocks drawer.

**Q: What fields are excluded when saving a preset?**
A: `id`, `blockType`, `blockName`, and `experiment` are stripped automatically.

**Q: Does the plugin support localization?**
A: Yes. Built-in translations for EN and ES are included under `presetsPlugin.*` i18n keys. The `name` field on the presets collection is also localized.

**Q: Can I use `getBlocksFieldWithPresetsPath()` without `createPresetActionsField()`?**
A: Yes — they are independent. The drawer shows presets for selection; the block buttons handle saving and applying. You can enable either or both.

## Further Reading

- Working examples → `./examples.md`
