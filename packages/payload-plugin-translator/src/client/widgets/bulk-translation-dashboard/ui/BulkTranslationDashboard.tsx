"use client";

import { toast, useLocale, useSelection } from "@payloadcms/ui";
import { SelectAllStatus } from "@payloadcms/ui/providers/Selection";
import { useEffect, useMemo } from "react";

import { TranslationsApi } from "../../../entities/translation";
import { CollectionTranslationForm, FORM_FIELDS } from '../../../features/collection-translation-form';
import type { FormValues } from '../../../features/collection-translation-form';
import { CollectionTranslationFormModel } from "../../../features/collection-translation-form/index.client";
import CollectionTranslationPopup from "../../../features/collection-translation-popup";
import { CollectionTranslationProgress } from "../../../features/collection-translation-progress";
import { handleFormError } from "../../../shared/lib/forms/handle-form-error";
import { useCollectionDashboardUrlParams } from "../../../shared/lib/payload/hooks/useCollectionDashboardUrlParams";

interface BulkTranslationDashboardProps {
  hasDrafts: boolean;
}

export default function BulkTranslationDashboard({
  hasDrafts,
}: BulkTranslationDashboardProps) {
  const locale = useLocale();
  const { collection } = useCollectionDashboardUrlParams();
  const documentsSelection = useSelection();

  const queueTranslationApi = TranslationsApi.useQueueDocumentTranslation();
  const collectionTranslationApi =
    TranslationsApi.useCollectionTranslationStatus({ collection });

  useEffect(() => {
    if (collectionTranslationApi.error) {
      toast.error(collectionTranslationApi.error.message);
    }
  }, [collectionTranslationApi.error]);

  const initialValues = useMemo(
    () => ({
      [FORM_FIELDS.SOURCE_LNG]: locale.code,
      [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: collection,
    }),
    [locale.code, collection]
  );

  const { form } = CollectionTranslationFormModel.useForm({
    disabled: collectionTranslationApi.isLoading,
    initialValues,
  });

  const selectAll =
    documentsSelection.selectAll === SelectAllStatus.AllAvailable;
  const selectedCount = selectAll
    ? documentsSelection.totalDocs
    : documentsSelection.count;

  const translationInProgress = !!(
    collectionTranslationApi.data?.pending.length ||
    collectionTranslationApi.data?.running.length
  );

  const handleSubmit = async (formData: FormValues) => {
    try {
      await queueTranslationApi.mutateAsync({
        ...formData,
        collection_id: documentsSelection.selectedIDs,
        select_all: selectAll,
      });
    } catch (error) {
      handleFormError(error, form);
    }
  };

  return (
    <CollectionTranslationPopup
      translationInProgress={translationInProgress}
      selectedCount={selectedCount}
    >
      <h3>Bulk Translation Dashboard</h3>
      <p>
        Translate multiple documents at once using AI. Select the records you
        want to translate on the collection dashboard, then configure your
        translation settings here.
      </p>
      <CollectionTranslationForm
        form={form}
        onSubmit={handleSubmit}
        selectedCount={selectedCount}
        hasDrafts={hasDrafts}
      />
      <CollectionTranslationProgress
        collection={collection}
        data={collectionTranslationApi.data}
        isPending={collectionTranslationApi.isPending}
      />
    </CollectionTranslationPopup>
  );
}
