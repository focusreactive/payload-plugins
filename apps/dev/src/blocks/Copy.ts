import type { Block, Field } from 'payload'
import { getBlockAdminComponents } from '@focus-reactive/payload-plugin-presets'

export const copyFields: Field[] = [
  {
    name: 'text',
    type: 'textarea',
    required: true,
  },
]

export const CopyBlock: Block = {
  slug: 'copy',
  labels: { singular: 'Copy', plural: 'Copy Sections' },
  fields: copyFields,
  admin: {
    components: getBlockAdminComponents(),
  },
}
