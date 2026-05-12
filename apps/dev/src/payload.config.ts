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

import { abTestingPlugin } from '@focus-reactive/payload-plugin-ab'
import { presetsPlugin } from '@focus-reactive/payload-plugin-presets'
import { schedulePublicationPlugin } from '@focus-reactive/payload-plugin-scheduling'
import { commentsPlugin } from '@focus-reactive/payload-plugin-comments'
import {
  translatorPlugin,
  createOpenAIProvider,
  createPayloadJobsRunner,
} from '@focus-reactive/payload-plugin-translator'
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
  localization: {
    locales: [
      { code: 'en', label: 'English' },
      { code: 'de', label: 'Deutsch' },
      { code: 'fr', label: 'Français' },
      { code: 'es', label: 'Español' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
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
    presetsPlugin(),
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
    translatorPlugin({
      collections: [Pages],
      translationProvider: createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY ?? '',
        dryRun: !process.env.OPENAI_API_KEY,
      }),
      runner: createPayloadJobsRunner(),
    }),
  ],
})
