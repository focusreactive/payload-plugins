import type { Block, Field } from 'payload'

const copyFields: Field[] = [
  {
    name: 'text',
    type: 'textarea',
    required: true,
    localized: true,
  },
]

export const CopyBlock: Block = {
  slug: 'copy',
  labels: { singular: 'Copy', plural: 'Copy Sections' },
  fields: copyFields,
}
