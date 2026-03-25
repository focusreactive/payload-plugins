# Examples

## Full Example

Configuration with all main options, including multiple preset types, overrides, and labels.

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { presetsPlugin } from "@focus-reactive/payload-plugin-presets";
import { heroFields } from "@/blocks/Hero/fields";
import { testimonialsFields } from "@/blocks/Testimonials/fields";

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

## Shared Fields Pattern

Extract fields to a shared file so block and preset type stay in sync.

```ts
// fields/heroFields.ts
import type { Field } from "payload";

export const heroFields: Field[] = [
  { name: "title", type: "text", required: true },
  { name: "subtitle", type: "textarea" },
  { name: "image", type: "upload", relationTo: "media" },
  { name: "ctaLabel", type: "text" },
  { name: "ctaUrl", type: "text" },
];
```

```ts
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

```ts
// payload.config.ts
presetsPlugin({
  presetTypes: [
    {
      value: "hero",         // Must match HeroBlock.slug exactly
      label: { en: "Hero" },
      fields: heroFields,    // Same imported array
    },
  ],
});
```

---

## Enabling Preset Selection in a Blocks Field

```ts
// collections/Page.ts
import type { CollectionConfig } from "payload";
import { getBlocksFieldWithPresetsPath } from "@focus-reactive/payload-plugin-presets";
import { HeroBlock } from "@/blocks/Hero/config";
import { ContentBlock } from "@/blocks/Content/config";

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

---

## Multiple Blocks with Presets

```ts
// payload.config.ts
import { HeroBlock } from "@/blocks/Hero/config";
import { ContentBlock } from "@/blocks/Content/config";
import { TestimonialsBlock } from "@/blocks/Testimonials/config";
import { heroFields } from "@/blocks/Hero/fields";
import { contentFields } from "@/blocks/Content/fields";
import { testimonialsFields } from "@/blocks/Testimonials/fields";

presetsPlugin({
  presetTypes: [
    { value: "hero", label: "Hero", fields: heroFields },
    { value: "content", label: "Content", fields: contentFields },
    { value: "testimonials", label: "Testimonials", fields: testimonialsFields },
  ],
});
```

Each block must include `createPresetActionsField()`:

```ts
// blocks/Content/config.ts
export const ContentBlock: Block = {
  slug: "content",
  fields: [...contentFields, createPresetActionsField()],
};

// blocks/Testimonials/config.ts
export const TestimonialsBlock: Block = {
  slug: "testimonials",
  fields: [...testimonialsFields, createPresetActionsField()],
};
```
