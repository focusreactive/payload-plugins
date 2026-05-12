import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ofetch } from 'ofetch'
import type { CollectionSlug } from 'payload'
import { useCallback } from 'react'

import { useTranslateKitConfig } from '../../../../app/config'
import { handleNextApiError } from '../../../../shared/lib/errors/handleApiError'
import { DocumentTranslationStatus } from '../../model/enums'
import type { CollectionTranslationStatus, GroupedCollectionTranslationStatus } from '../../model/types'

type Props = {
  collection: CollectionSlug
}

type Options = {
  enabled?: boolean
}

const getCollectionTranslationQueryKey = ({ collection }: Props) => {
  return ['collection-translation-status', collection]
}

const POLLING_INTERVAL_MILLISECONDS = 20000 // 20 sec

export function useCollectionTranslationStatus({ collection }: Props, options?: Options) {
  const queryClient = useQueryClient()
  const { basePath } = useTranslateKitConfig()

  const query = useQuery<CollectionTranslationStatus, Error, GroupedCollectionTranslationStatus>({
    queryKey: getCollectionTranslationQueryKey({ collection }),
    queryFn: async ({ signal }) => {
      return handleNextApiError(async () => {
        const response = await ofetch<{ data: CollectionTranslationStatus }>(
          `/api${basePath}/collection/${collection}`,
          { method: 'get', signal },
        )

        return response.data
      })
    },
    enabled: options?.enabled,
    refetchInterval: (query) => {
      const docs = query.state.data?.docs
      const pending = docs?.some((doc) => doc.status === DocumentTranslationStatus.PENDING)
      const running = docs?.some((doc) => doc.status === DocumentTranslationStatus.RUNNING)
      return pending || running ? POLLING_INTERVAL_MILLISECONDS : false
    },
    select: (data): GroupedCollectionTranslationStatus => {
      const grouped: GroupedCollectionTranslationStatus = {
        [DocumentTranslationStatus.PENDING]: [],
        [DocumentTranslationStatus.RUNNING]: [],
        [DocumentTranslationStatus.COMPLETED]: [],
        [DocumentTranslationStatus.FAILED]: [],
      }

      data.docs.forEach((doc) => {
        if (grouped[doc.status]) grouped[doc.status].push(doc)
      })

      return grouped
    },
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getCollectionTranslationQueryKey({ collection }) })
  }, [collection, queryClient])

  return { ...query, invalidate }
}
