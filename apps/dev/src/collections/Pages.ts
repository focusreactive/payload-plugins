import type { CollectionConfig } from 'payload'
import { HeroBlock } from '../blocks/Hero'
import { CopyBlock } from '../blocks/Copy'

export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: {
    drafts: true,
  },
  admin: {
    useAsTitle: 'title',
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL}/${data.slug}`,
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'sections',
      type: 'blocks',
      blocks: [HeroBlock, CopyBlock],
      localized: true,
    },
  ],
}
