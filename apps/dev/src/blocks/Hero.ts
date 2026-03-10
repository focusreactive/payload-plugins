import type { Block } from 'payload'
import { createPresetActionsField } from '@focus-reactive/payload-plugin-presets'

export const heroFields = [
  {
    name: 'title',
    type: 'text' as const,
    required: true,
  },
  {
    name: 'subtitle',
    type: 'textarea' as const,
  },
  {
    name: 'image',
    type: 'upload' as const,
    relationTo: 'media' as const,
  },
]

export const HeroBlock: Block = {
  slug: 'hero',
  labels: {
    singular: 'Hero',
    plural: 'Heroes',
  },
  fields: [
    ...heroFields,
    createPresetActionsField(),
  ],
}
