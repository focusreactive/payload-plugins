# Examples

## Full Example

All options: custom slug, labels, preset type overrides, access control, and extra fields.

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";

export default buildConfig({
  plugins: [
    presetsPlugin({
      enabled: true,
      slug: "presets",
      labels: {
        singular: { en: "Preset", es: "Preset" },
        plural: { en: "Presets", es: "Presets" },
      },
      mediaCollection: "media",
      // Optional: override label or fields for specific blocks
      presetTypes: [
        {
          slug: "hero",
          label: { en: "Hero", es: "Hero" },
          // fields omitted → auto-derived from block.fields
        },
        {
          slug: "testimonials",
          label: { en: "Testimonials", es: "Testimonios" },
          fields: testimonialsPresetFields, // explicit override
        },
      ],
      overrides: {
        access: {
          read: ({ req }) => !!req.user,
          create: ({ req }) => !!req.user,
          update: ({ req }) => req.user?.role === "admin",
          delete: ({ req }) => req.user?.role === "admin",
        },
        fields: (defaultFields) => [
          ...defaultFields,
          {
            name: "tags",
            type: "array",
            fields: [{ name: "tag", type: "text" }],
          },
        ],
      },
    }),
  ],
});
```

---

## Blocks — No Changes Required

The plugin injects Save/Apply buttons automatically via the block label component.

```ts
// blocks/Hero/config.ts
import type { Block } from "payload";

export const HeroBlock: Block = {
  slug: "hero",
  labels: {
    singular: { en: "Hero", es: "Hero" },
    plural: { en: "Heroes", es: "Heroes" },
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "subtitle", type: "textarea" },
    { name: "image", type: "upload", relationTo: "media" },
  ],
};
```

---

## Collections — No Changes Required

Blocks fields get the enhanced drawer injected automatically.

```ts
// collections/Pages.ts
import type { CollectionConfig } from "payload";
import { HeroBlock } from "@/blocks/Hero/config";
import { ContentBlock } from "@/blocks/Content/config";

export const Pages: CollectionConfig = {
  slug: "pages",
  fields: [
    {
      name: "blocks",
      type: "blocks",
      blocks: [HeroBlock, ContentBlock],
    },
  ],
};
```

---

## Overriding Fields for a Specific Block

Supply a `fields` override when the preset editor form should use a different (e.g., smaller) set of fields than the block itself.

```ts
// blocks/Hero/presetFields.ts
export const heroPresetFields: Field[] = [
  { name: "title", type: "text", required: true },
  { name: "subtitle", type: "textarea" },
  // image excluded from preset
];
```

```ts
// payload.config.ts
presetsPlugin({
  presetTypes: [
    {
      slug: "hero",
      fields: heroPresetFields,
    },
  ],
});
```

---

## Multiple Blocks

No per-block setup needed. Just register them in your collection normally.

```ts
// payload.config.ts
presetsPlugin({
  // Optionally override labels for any blocks
  presetTypes: [
    { slug: "hero", label: "Hero" },
    { slug: "content", label: "Content" },
    { slug: "testimonials", label: "Testimonials" },
  ],
});
```
