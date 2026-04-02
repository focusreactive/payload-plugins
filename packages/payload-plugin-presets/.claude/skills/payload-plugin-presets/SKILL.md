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

export default buildConfig({
  plugins: [presetsPlugin()],
  // ... rest of your config
});
```

### 3. Regenerate the import map

```bash
npx payload generate:importmap
# or: pnpm payload generate:importmap / bunx payload generate:importmap
```

If you skip this step, preset action buttons and the custom blocks drawer will not appear in the admin UI.

### 4. SQL adapters only — run a migration

```bash
npx payload migrate:create create_presets
npx payload migrate
```

Skip if you use the MongoDB adapter.

---

## Configuration Reference

| Option            | Type           | Default                                    | Description                                                                  |
| ----------------- | -------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| `presetTypes`     | `PresetType[]` | `[]`                                       | Optional overrides per block slug — label and fields fall back automatically |
| `enabled`         | `boolean`      | `true`                                     | Enable/disable the plugin entirely                                           |
| `slug`            | `string`       | `'presets'`                                | Collection slug for presets storage                                          |
| `labels`          | `object`       | —                                          | Collection labels (singular/plural, supports i18n)                           |
| `mediaCollection` | `string`       | `'media'`                                  | Media collection slug for preview images                                     |
| `packageName`     | `string`       | `'@focus-reactive/payload-plugin-presets'` | Override for component resolution (local dev only)                           |
| `overrides`       | `object`       | —                                          | Custom access, hooks, fields, or admin for the collection                    |

### PresetType

```ts
interface PresetType {
  slug: string; // Block slug to target — MUST match block.slug exactly
  label?: string | { en: string; es?: string }; // Optional — falls back to block.labels.singular or slug
  fields?: Field[]; // Optional — falls back to block.fields automatically
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
2. **Auto block discovery** — All blocks in collections and globals are discovered automatically. Save/Apply buttons (`BlockLabelWithPresets`) and the custom blocks drawer (`BlocksFieldWithPresets`) are injected into every block and `type: "blocks"` field without any manual wiring.
3. **Preview images** — Each preset can have an optional preview image (from the `media` collection) shown in the blocks drawer.
4. **Auto key stripping** — Internal Payload keys (`id`, `blockType`, `blockName`, `experiment`) are automatically excluded when saving a preset.

---

## Usage Patterns

### Overriding label or fields for a specific block

By default, blocks are auto-discovered and use `block.fields` and `block.labels.singular`. To override:

```ts
// payload.config.ts
presetsPlugin({
  presetTypes: [
    {
      slug: "hero",
      label: { en: "Hero Section", es: "Sección Hero" },
      // fields omitted → uses block.fields automatically
    },
  ],
});
```

To use a different fields subset for the preset editor form:

```ts
presetsPlugin({
  presetTypes: [
    {
      slug: "hero",
      fields: heroPresetFields, // subset of heroFields
    },
  ],
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

- **`presetTypes[].slug` must match block slug exactly (if you provide overrides)** — This is what the plugin uses to match override entries to auto-discovered blocks. A mismatch means the override is silently ignored.
- **`fields` in `presetTypes` must match the block's fields** — If you provide a `fields` override, it defines the editor form inside the presets collection. If they diverge from the block's actual fields, saved presets may apply incorrectly.
- **Import map must be regenerated** — Run `payload generate:importmap` after adding the plugin. Without it, Save/Apply buttons and the custom blocks drawer won't appear.
- **SQL adapters need a migration** — After adding the plugin, run `payload migrate:create` and `payload migrate` to create the `presets` table.
- **`packageName` is for local development only** — Only set this if you're developing the plugin locally without it published to npm.

---

## FAQ

**Q: Do I need to list every block in `presetTypes`?**
A: No — blocks are auto-discovered. `presetTypes` is optional. Provide entries only when you need to override the auto-derived label or fields for a specific block.

**Q: Where are presets stored?**
A: In a `presets` collection (configurable via `slug`) that the plugin creates automatically.

**Q: Can I use preview images?**
A: Yes. The preset editor has an optional `preview` upload field. Set `mediaCollection` if your media collection has a non-default slug. Preview images appear in the blocks drawer.

**Q: What fields are excluded when saving a preset?**
A: `id`, `blockType`, `blockName`, and `experiment` are stripped automatically.

**Q: Does the plugin support localization?**
A: Yes. Built-in translations for EN and ES are included under `presetsPlugin.*` i18n keys. The `name` field on the presets collection is also localized.

## Further Reading

- Working examples → `./examples.md`
