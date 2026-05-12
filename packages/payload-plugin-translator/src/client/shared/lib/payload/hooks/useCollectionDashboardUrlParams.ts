import { useParams } from 'next/navigation'
import type { CollectionSlug } from 'payload'

type UseCollectionUrlParamsReturn = {
  collection: CollectionSlug
}

export function useCollectionDashboardUrlParams(): UseCollectionUrlParamsReturn {
  const { segments } = useParams<{ segments?: [string, CollectionSlug] }>()
  if (!segments) {
    throw new Error(`CollectionTranslationProgress component must be used within collection dashboard`)
  }

  return { collection: segments[1] }
}
