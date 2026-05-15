import { toast } from "@payloadcms/ui";

import type { DocumentTranslationPending } from "../../../entities/translation";
import { TranslationsApi } from "../../../entities/translation";
import { PendingTranslationStatus } from "../../../entities/translation";

interface DocumentTranslationProgressPendingProps {
  data: DocumentTranslationPending;
}

export function DocumentTranslationProgressPending({
  data,
}: DocumentTranslationProgressPendingProps) {
  const cancelDocumentTranslationApi =
    TranslationsApi.useCancelDocumentTranslation();
  const runQueuedTranslationApi = TranslationsApi.useRunDocumentTranslation();

  const handleCancelDocumentTranslation = async () => {
    try {
      await cancelDocumentTranslationApi.mutateAsync({ id: data.id });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error canceling document translation");
      }
    }
  };

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
    <PendingTranslationStatus
      onRun={handleRunDocumentTranslation}
      createdAt={data.created_at}
      sourceLocale={data.input.source_lng}
      targetLocale={data.input.target_lng}
      isLoading={
        cancelDocumentTranslationApi.isPending ||
        runQueuedTranslationApi.isPending
      }
      onCancel={handleCancelDocumentTranslation}
    />
  );
}
