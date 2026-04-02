# @focus-reactive/payload-plugin-presets

A plugin for [Payload CMS](https://payloadcms.com/) that enables saving and applying reusable block presets in the admin panel.

## Features

- Save block configurations as reusable presets
- Apply presets to blocks with one click
- Preview images for presets in admin panel
- Custom blocks drawer with preset selection
- Auto-discovers blocks — no block or collection modifications needed
- Multi-language support (EN/ES)

## Installation

```bash
pnpm add @focus-reactive/payload-plugin-presets
# or
npm install @focus-reactive/payload-plugin-presets
```

## Usage

### 1. Register the Plugin

```typescript
// payload.config.ts
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";

export default buildConfig({
  plugins: [presetsPlugin()],
});
```

The plugin **auto-discovers all blocks** in your collections and globals and injects Save/Apply buttons and the enhanced blocks drawer automatically. No changes to blocks or collections are needed.

### 2. Regenerate the Import Map

```bash
npx payload generate:importmap
# or: pnpm payload generate:importmap / bunx payload generate:importmap
```

### 3. SQL adapters only — run a migration

```bash
npx payload migrate:create create_presets
npx payload migrate
```

Skip if you use the MongoDB adapter.

---

## Configuration

```typescript
presetsPlugin({
  // Optional: override label or fields for specific block types
  presetTypes: [
    {
      slug: "hero", // must match block.slug exactly
      label: { en: "Hero", es: "Hero" }, // optional, falls back to block.labels.singular
      fields: heroPresetFields, // optional, falls back to block.fields
    },
  ],

  // Optional: defaults shown
  slug: "presets",
  labels: {
    singular: { en: "Preset", es: "Preset" },
    plural: { en: "Presets", es: "Presets" },
  },
  mediaCollection: "media",
  enabled: true,

  // Optional: collection overrides
  overrides: {
    access: {
      create: authenticated,
      read: authenticated,
      update: authenticated,
      delete: authenticated,
    },
    fields: (defaultFields) => [...defaultFields, customField],
    hooks: {
      beforeChange: [myHook],
    },
    admin: {
      defaultColumns: ["name", "type", "updatedAt"],
    },
  },
});
```

## API Reference

### `presetsPlugin(config?)`

Main plugin function. All options are optional.

| Option            | Type           | Default                                    | Description                                                               |
| ----------------- | -------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| `presetTypes`     | `PresetType[]` | `[]`                                       | Per-block overrides for label and fields — both fall back automatically   |
| `slug`            | `string`       | `'presets'`                                | Collection slug for presets                                               |
| `labels`          | `object`       | —                                          | Collection labels                                                         |
| `enabled`         | `boolean`      | `true`                                     | Enable/disable plugin                                                     |
| `packageName`     | `string`       | `'@focus-reactive/payload-plugin-presets'` | Override for component resolution (set to local path for dev without npm) |
| `mediaCollection` | `string`       | `'media'`                                  | Media collection for preview images                                       |
| `overrides`       | `object`       | —                                          | Collection overrides (access, fields, hooks, admin)                       |

### `PresetType`

```typescript
interface PresetType {
  slug: string; // Block slug to target — must match block.slug exactly
  label?: string | { en: string; es?: string }; // Falls back to block.labels.singular or slug
  fields?: Field[]; // Falls back to block.fields automatically
}
```

## Translations

The plugin includes built-in translations for English and Spanish. Keys are under `presetsPlugin`:

- `presetsPlugin.presetActions.*` - Save preset modal
- `presetsPlugin.applyPreset.*` - Apply preset messages
- `presetsPlugin.blocksDrawer.*` - Blocks drawer labels

## Notes

- The plugin automatically strips internal keys (`id`, `blockType`, `blockName`, `experiment`) when saving presets
- Preview images are optional but recommended for better UX in the blocks drawer
- The plugin also transforms blocks fields inside globals

## License

MIT
