import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ofetch } from 'ofetch'

import { useTranslateKitConfig } from '../../../../app/config'
import { handleNextApiError } from '../../../../shared/lib/errors/handleApiError'

type Variables = {
  collection: string
}

export function useCancelCollectionTranslations() {
  const queryClient = useQueryClient()
  const { basePath } = useTranslateKitConfig()

  return useMutation({
    mutationKey: ['cancel-collection-translations'],
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() =>
        ofetch(`/api${basePath}/cancel-by-collection/${variables.collection}`, {
          method: 'delete',
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-translation-status'] })
    },
  })
}
