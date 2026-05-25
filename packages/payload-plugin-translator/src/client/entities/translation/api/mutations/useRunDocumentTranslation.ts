import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ofetch } from 'ofetch'

import { useTranslateKitConfig } from '../../../../app/config'
import { handleNextApiError } from '../../../../shared/lib/errors/handleApiError'

type Variables = {
  id: string
}

export function useRunDocumentTranslation() {
  const queryClient = useQueryClient()
  const { basePath } = useTranslateKitConfig()

  return useMutation({
    mutationKey: ['run-document-translation'],
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() =>
        ofetch<{ data: null }>(`/api${basePath}/run/${variables.id}`, {
          method: 'post',
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-translation-status'] })
    },
  })
}
