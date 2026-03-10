# @focus-reactive/payload-plugin-presets

A plugin for [Payload CMS](https://payloadcms.com/) that enables saving and applying reusable block presets in the admin panel.

## Features

- Save block configurations as reusable presets
- Apply presets to blocks with one click
- Preview images for presets in admin panel
- Custom blocks drawer with preset selection
- Multi-language support (EN/ES)

## Installation

```bash
pnpm add @focus-reactive/payload-plugin-presets
# or
npm install @focus-reactive/payload-plugin-presets
```

## Usage

### 1. Basic Plugin Setup

```typescript
// payload.config.ts
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { heroFields } from "@/fields/heroFields";

export default buildConfig({
  plugins: [
    presetsPlugin({
      // Required: define preset types
      presetTypes: [
        {
          value: "hero",
          label: { en: "Hero", es: "Hero" },
          fields: heroFields,
        },
        {
          value: "testimonials",
          label: { en: "Testimonials", es: "Testimonios" },
          fields: testimonialsFields,
        },
      ],

      // Optional: defaults to 'presets'
      slug: "presets",

      // Optional: collection labels
      labels: {
        singular: { en: "Preset", es: "Preset" },
        plural: { en: "Presets", es: "Presets" },
      },

      // Optional: media collection for preview images (default: 'media')
      mediaCollection: "media",

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
    }),
  ],
});
```

### 2. Add Preset Actions to Blocks

Use `createPresetActionsField()` to add Save/Apply buttons to your blocks:

```typescript
// blocks/Hero/config.ts
import type { Block } from "payload";
import { createPresetActionsField } from "@focus-reactive/payload-plugin-presets";
import { heroFields } from "@/fields/heroFields";

export const HeroBlock: Block = {
  slug: "hero",
  fields: [
    ...heroFields,
    createPresetActionsField(), // Adds Save/Apply preset buttons
  ],
};
```

### 3. Enable Preset Selection in Blocks Drawer

Use `getBlocksFieldWithPresetsPath()` to replace the default blocks field with one that shows presets:

```typescript
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

### 4. Complete Block Setup Example

```typescript
// fields/heroFields.ts
import type { Field } from "payload";

export const heroFields: Field[] = [
  { name: "title", type: "text", required: true },
  { name: "subtitle", type: "textarea" },
  { name: "image", type: "upload", relationTo: "media" },
];
```

```typescript
// blocks/Hero/config.ts
import type { Block } from "payload";
import { createPresetActionsField } from "@focus-reactive/payload-plugin-presets";
import { heroFields } from "@/fields/heroFields";

export const HeroBlock: Block = {
  slug: "hero",
  interfaceName: "HeroBlock",
  labels: {
    singular: { en: "Hero", es: "Hero" },
    plural: { en: "Heroes", es: "Heroes" },
  },
  fields: [...heroFields, createPresetActionsField()],
};
```

```typescript
// payload.config.ts
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { heroFields } from "@/fields/heroFields";

export default buildConfig({
  plugins: [
    presetsPlugin({
      presetTypes: [
        {
          value: "hero", // Must match block slug
          label: { en: "Hero", es: "Hero" },
          fields: heroFields, // Same fields as the block
        },
      ],
    }),
  ],
});
```

## API Reference

### `presetsPlugin(config)`

Main plugin function.

| Option            | Type           | Default                                    | Description                                                               |
| ----------------- | -------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| `slug`            | `string`       | `'presets'`                                | Collection slug for presets                                               |
| `labels`          | `object`       | -                                          | Collection labels                                                         |
| `enabled`         | `boolean`      | `true`                                     | Enable/disable plugin                                                     |
| `packageName`     | `string`       | `'@focus-reactive/payload-plugin-presets'` | Override for component resolution (set to local path for dev without npm) |
| `mediaCollection` | `string`       | `'media'`                                  | Media collection for preview images                                       |
| `presetTypes`     | `PresetType[]` | **required**                               | Array of preset type definitions                                          |
| `overrides`       | `object`       | -                                          | Collection overrides (access, fields, hooks, admin)                       |

### `createPresetActionsField(packageName?)`

Creates a UI field that renders Save/Apply preset buttons.

```typescript
const field = createPresetActionsField();
```

### `getBlocksFieldWithPresetsPath(packageName?)`

Returns the component path for the enhanced blocks field with preset selection.

```typescript
const path = getBlocksFieldWithPresetsPath();
// Returns: '@focus-reactive/payload-plugin-presets/client#BlocksFieldWithPresets'
```

## Client Exports

The plugin exports client components from the `/client` entry point:

```typescript
import {
  PresetAdminComponentPreview,
  PresetAdminComponentCell,
  PresetActions,
  PresetActionsField,
  BlocksFieldWithPresets,
  BlockSelectorWithPresets,
  EmptyPlaceholder,
  DefaultBlockImage,
  usePresetsConfig,
  getParentPath,
  getPresetTypeFromPath,
} from "@focus-reactive/payload-plugin-presets/client";
```

## Translations

The plugin includes built-in translations for English and Spanish. Keys are under `presetsPlugin`:

- `presetsPlugin.presetActions.*` - Save preset modal
- `presetsPlugin.applyPreset.*` - Apply preset messages
- `presetsPlugin.blocksDrawer.*` - Blocks drawer labels

## Important Requirements

**Block slug must match preset type value.** When defining preset types, the `value` must exactly match the block's `slug`:

```typescript
// Block definition
export const HeroBlock: Block = {
  slug: "hero", // <-- This slug
};

// Preset type definition
presetsPlugin({
  presetTypes: [
    {
      value: "hero", // <-- Must match block slug exactly
      label: { en: "Hero" },
      fields: heroFields,
    },
  ],
});
```

This matching is required for:

- Automatic preset type detection when saving
- Correct preset filtering in blocks drawer
- Apply preset functionality to work properly

## Notes

- The plugin automatically strips internal keys (`id`, `blockType`, `blockName`, `experiment`) when saving presets
- Preview images are optional but recommended for better UX in the blocks drawer

## License

MIT
