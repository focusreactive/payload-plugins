"use client";

import { toast, useLocale } from "@payloadcms/ui";
import { useEffect, useMemo } from "react";

import {
  CompletedTranslationStatus,
  TranslationsApi,
} from "../../../entities/translation";
import { DocumentTranslationProgressFailed } from "../../../features/document-translation-progress-failed";
import { DocumentTranslationProgressPending } from "../../../features/document-translation-progress-pending";
import { DocumentTranslationProgressRunning } from "../../../features/document-translation-progress-running";
import { OpenDocumentTranslationPopup } from "../../../features/open-document-translation-popup";
import { DocumentTranslationForm, FORM_FIELDS } from '../../../features/translate-document-form';
import type { FormValues } from '../../../features/translate-document-form';
import { DocumentTranslationFormModel } from "../../../features/translate-document-form/index.client";
import { handleFormError } from "../../../shared/lib/forms/handle-form-error";
import { useCollectionDocumentUrlParams } from "../../../shared/lib/payload/hooks/useCollectionDocumentUrlParams";

interface TranslateDocumentProps {
  hasDrafts: boolean;
}

const TranslateDocument = ({ hasDrafts }: TranslateDocumentProps) => {
  const locale = useLocale();
  const params = useCollectionDocumentUrlParams();

  const queueTranslationApi = TranslationsApi.useQueueDocumentTranslation();
  const { data, error, isLoading } =
    TranslationsApi.useDocumentTranslation(params);

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const initialValues = useMemo(
    () => ({
      [FORM_FIELDS.SOURCE_LNG]: locale.code,
      [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: params.collection,
      [FORM_FIELDS.HIDDEN_COLLECTION_ID]: params.id,
    }),
    [locale.code, params.collection, params.id]
  );

  const { form } = DocumentTranslationFormModel.useForm({ initialValues });

  const handleSubmit = async (formData: FormValues, onSuccess?: () => void) => {
    try {
      await queueTranslationApi.mutateAsync({
        ...formData,
        collection_id: [formData[FORM_FIELDS.HIDDEN_COLLECTION_ID]],
      });
      onSuccess?.();
    } catch (error) {
      handleFormError(error, form);
    }
  };

  return (
    <>
      <OpenDocumentTranslationPopup isLoading={isLoading}>
        {({ close }) => (
          <>
            <h4>Document Translation</h4>
            <DocumentTranslationForm
              form={form}
              onSubmit={(data) => handleSubmit(data, close)}
              hasDrafts={hasDrafts}
            />
          </>
        )}
      </OpenDocumentTranslationPopup>

      {data?.status === "completed" && (
        <CompletedTranslationStatus
          sourceLocale={data.input.source_lng}
          targetLocale={data.input.target_lng}
          completed_at={data.completed_at}
        />
      )}
      {data?.status === "failed" && (
        <DocumentTranslationProgressFailed data={data} />
      )}
      {data?.status === "running" && (
        <DocumentTranslationProgressRunning data={data} />
      )}
      {data?.status === "pending" && (
        <DocumentTranslationProgressPending data={data} />
      )}
    </>
  );
};

export default TranslateDocument;
