import configPromise from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import type { Config } from "src/payload-types";

type Collection = keyof Config["collections"];

async function getDocument(collection: Collection, slug: string, depth = 0) {
  const payload = await getPayload({ config: configPromise });

  const page = await payload.find({
    collection,
    depth,
    where: {
      slug: {
        equals: slug,
      },
    },
  });

  return page.docs[0];
}

async function getDocumentByID(
  collection: Collection,
  id: number,
  depth = 1
): Promise<Config["collections"][Collection] | null> {
  const payload = await getPayload({ config: configPromise });
  try {
    const doc = await payload.findByID({
      collection,
      depth,
      draft: false,
      id,
    });
    return doc as Config["collections"][Collection];
  } catch {
    return null;
  }
}

export const getCachedDocument = (collection: Collection, slug: string) =>
  unstable_cache(
    async () => getDocument(collection, slug),
    [collection, slug],
    {
      tags: [`${collection}_${slug}`],
    }
  );

export const getCachedDocumentByID = (collection: Collection, id: number) =>
  unstable_cache(
    async () => getDocumentByID(collection, id),
    [collection, id.toString()],
    {
      tags: [`${collection}_id_${id}`],
    }
  );
