import { toast } from '@payloadcms/ui'

import type { DocumentTranslationRunning } from '../../../entities/translation'
import { RunningTranslationStatus, TranslationsApi } from '../../../entities/translation'

type DocumentTranslationProgressRunningProps = {
  data: DocumentTranslationRunning
}

export function DocumentTranslationProgressRunning({ data }: DocumentTranslationProgressRunningProps) {
  const cancelDocumentTranslationApi = TranslationsApi.useCancelDocumentTranslation()

  const handleCancelDocumentTranslation = async () => {
    try {
      await cancelDocumentTranslationApi.mutateAsync({ id: data.id })
    } catch (e) {
      if (e instanceof Error) {
        toast.error(e.message)
      } else {
        toast.error('Error canceling document translation')
      }
    }
  }

  return (
    <RunningTranslationStatus
      createdAt={data.created_at}
      sourceLocale={data.input.source_lng}
      targetLocale={data.input.target_lng}
      isLoading={cancelDocumentTranslationApi.isPending}
      onCancel={handleCancelDocumentTranslation}
    />
  )
}
