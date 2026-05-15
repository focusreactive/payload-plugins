import type { Config } from '@/payload-types'

import { getPayloadClient } from '@/dal/payload-client'
import { unstable_cache } from 'next/cache'

type Collection = keyof Config['collections']

async function getDocument(collection: Collection, slug: string, depth = 0) {
  const payload = await getPayloadClient()

  const page = await payload.find({
    collection,
    depth,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return page.docs[0]
}

async function getDocumentByID(
  collection: Collection,
  id: number,
  depth = 1,
): Promise<Config['collections'][Collection] | null> {
  const payload = await getPayloadClient()
  try {
    const doc = await payload.findByID({
      collection,
      id,
      depth,
      draft: false,
    })
    return doc as Config['collections'][Collection]
  } catch {
    return null
  }
}

export const getCachedDocument = (collection: Collection, slug: string) =>
  unstable_cache(async () => getDocument(collection, slug), [collection, slug], {
    tags: [`${collection}_${slug}`],
  })

export const getCachedDocumentByID = (collection: Collection, id: number) =>
  unstable_cache(async () => getDocumentByID(collection, id), [collection, id.toString()], {
    tags: [`${collection}_id_${id}`],
  })
