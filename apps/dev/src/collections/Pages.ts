import type { CollectionConfig } from 'payload'
import { getBlocksFieldWithPresetsPath } from '@focus-reactive/payload-plugin-presets'
import { HeroBlock } from '../blocks/Hero'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'blocks',
      type: 'blocks',
      blocks: [HeroBlock],
      admin: {
        components: {
          Field: getBlocksFieldWithPresetsPath(),
        },
      },
    },
  ],
}
