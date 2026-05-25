import { toast } from '@payloadcms/ui'

import type { DocumentTranslationFailed } from '../../../entities/translation'
import { FailedTranslationStatus, TranslationsApi } from '../../../entities/translation'

type DocumentTranslationProgressFailedProps = {
  data: DocumentTranslationFailed
}

export function DocumentTranslationProgressFailed({ data }: DocumentTranslationProgressFailedProps) {
  const runQueuedTranslationApi = TranslationsApi.useRunDocumentTranslation()

  const handleRunDocumentTranslation = async () => {
    try {
      await runQueuedTranslationApi.mutateAsync({ id: data.id })
    } catch (e) {
      if (e instanceof Error) {
        toast.error(e.message)
      } else {
        toast.error('Error running document translation')
      }
    }
  }

  return (
    <FailedTranslationStatus
      onRetry={handleRunDocumentTranslation}
      isLoading={runQueuedTranslationApi.isPending}
      sourceLocale={data.input.source_lng}
      targetLocale={data.input.target_lng}
      message={data.error.message}
    />
  )
}
