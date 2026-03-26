import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Header } from './globals/Header'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { heroFields } from './blocks/Hero'
import { copyFields } from './blocks/Copy'

import { abTestingPlugin } from '@focus-reactive/payload-plugin-ab'
import { presetsPlugin } from '@focus-reactive/payload-plugin-presets'
import { schedulePublicationPlugin } from '@focus-reactive/payload-plugin-scheduling'
import { commentsPlugin } from '@focus-reactive/payload-plugin-comments'
import { contentReleasesPlugin } from '@focus-reactive/payload-plugin-content-releases'
import { abAdapter } from './lib/ab-testing/dbAdapter'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Desktop', name: 'desktop', width: 1280, height: 900 },
      ],
    },
  },
  collections: [Users, Media, Pages],
  globals: [Header],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    abTestingPlugin({
      storage: abAdapter,
      collections: {
        pages: {
          generatePath: ({ doc }) => {
            const slug = doc.slug as string | undefined
            if (!slug) return null
            return `/${slug}`
          },
        },
      },
    }),
    presetsPlugin({
      presetTypes: [
        {
          value: 'hero',
          label: { en: 'Hero' },
          fields: heroFields,
        },
        {
          value: 'copy',
          label: { en: 'Copy' },
          fields: copyFields,
        },
      ],
    }),
    schedulePublicationPlugin({
      secret: 'secret',
      collections: ['pages', 'users'],
    }),
    commentsPlugin({
      collections: [
        {
          slug: 'pages',
          titleField: 'title',
        },
      ],
      usernameFieldPath: 'name',
    }),
    contentReleasesPlugin({
      enabledCollections: ['pages'],
    }),
  ],
})
