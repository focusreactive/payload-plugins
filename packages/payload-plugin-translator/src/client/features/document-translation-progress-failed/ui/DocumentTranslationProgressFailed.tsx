import { toast } from "@payloadcms/ui";

import type { DocumentTranslationFailed } from "../../../entities/translation";
import {
  FailedTranslationStatus,
  TranslationsApi,
} from "../../../entities/translation";

interface DocumentTranslationProgressFailedProps {
  data: DocumentTranslationFailed;
}

export function DocumentTranslationProgressFailed({
  data,
}: DocumentTranslationProgressFailedProps) {
  const runQueuedTranslationApi = TranslationsApi.useRunDocumentTranslation();

  const handleRunDocumentTranslation = async () => {
    try {
      await runQueuedTranslationApi.mutateAsync({ id: data.id });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error running document translation");
      }
    }
  };

  return (
    <FailedTranslationStatus
      onRetry={handleRunDocumentTranslation}
      isLoading={runQueuedTranslationApi.isPending}
      sourceLocale={data.input.source_lng}
      targetLocale={data.input.target_lng}
      message={data.error.message}
    />
  );
}
