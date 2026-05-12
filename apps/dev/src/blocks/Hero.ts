import type { Block, Field } from 'payload'

const heroFields: Field[] = [
  {
    name: 'title',
    type: 'text',
    required: true,
    localized: true,
  },
  {
    name: 'description',
    type: 'textarea',
    localized: true,
  },
]

export const HeroBlock: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: heroFields,
}
