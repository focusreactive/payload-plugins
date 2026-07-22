"use client";

import { toast, useLocale, useSelection } from "@payloadcms/ui";
import { SelectAllStatus } from "@payloadcms/ui/providers/Selection";
import { useEffect, useMemo } from "react";

import {
  AutoTranslateMarker,
  deriveCollectionPanelStatus,
  TranslationsApi,
} from "../../../entities/translation";
import type { AutoTranslateSummary } from "../../../entities/translation/model/autoTranslateSummary";
import type { TargetSelectionMode } from "../../../../types/TargetSelection";
import {
  CollectionTranslationForm,
  FORM_FIELDS,
} from "../../../features/collection-translation-form";
import type { FormValues } from "../../../features/collection-translation-form";
import { CollectionTranslationFormModel } from "../../../features/collection-translation-form/index.client";
import CollectionTranslationPopup from "../../../features/collection-translation-popup";
import { CollectionTranslationProgress } from "../../../features/collection-translation-progress";
import { handleFormError } from "../../../shared/lib/forms/handle-form-error";
import { useCollectionDashboardUrlParams } from "../../../shared/lib/payload/hooks/useCollectionDashboardUrlParams";

import styles from "./styles.module.scss";

type BulkTranslationDashboardProps = {
  hasDrafts: boolean;
  autoTranslate: AutoTranslateSummary | null;
  targetSelection: TargetSelectionMode;
};

export default function BulkTranslationDashboard({
  hasDrafts,
  autoTranslate,
  targetSelection,
}: BulkTranslationDashboardProps) {
  const locale = useLocale();
  const { collection } = useCollectionDashboardUrlParams();
  const documentsSelection = useSelection();

  const queueTranslationApi = TranslationsApi.useQueueDocumentTranslation();
  const collectionTranslationApi = TranslationsApi.useCollectionTranslationStatus({ collection });

  useEffect(() => {
    if (collectionTranslationApi.error) {
      toast.error(collectionTranslationApi.error.message);
    }
  }, [collectionTranslationApi.error]);

  const initialValues = useMemo(
    () => ({
      [FORM_FIELDS.SOURCE_LNG]: locale.code,
      // Multi mode binds an array; single mode a string. Seed the matching empty value so the field
      // starts with the right shape (and invalid until a target is chosen).
      [FORM_FIELDS.TARGET_LNG]: targetSelection === "multi" ? [] : "",
      [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: collection,
    }),
    [locale.code, collection, targetSelection]
  );

  const { form } = CollectionTranslationFormModel.useForm({
    initialValues,
    disabled: collectionTranslationApi.isLoading,
  });

  const selectAll = documentsSelection.selectAll === SelectAllStatus.AllAvailable;
  const selectedCount = selectAll ? documentsSelection.totalDocs : documentsSelection.count;

  const status = collectionTranslationApi.data;
  const panelStatus = deriveCollectionPanelStatus(status);
  const hasAnyCount = !!(
    status &&
    (status.completed.length ||
      status.failed.length ||
      status.running.length ||
      status.pending.length)
  );
  const showStatus = collectionTranslationApi.isPending || hasAnyCount;

  const handleSubmit = async (formData: FormValues) => {
    try {
      await queueTranslationApi.mutateAsync({
        ...formData,
        collection_id: documentsSelection.selectedIDs,
        select_all: selectAll,
      });
    } catch (e) {
      handleFormError(e, form);
    }
  };

  return (
    <CollectionTranslationPopup status={panelStatus} selectedCount={selectedCount}>
      <div className={styles.header}>
        <h4 className={styles.title}>Bulk translation</h4>
        {autoTranslate && (
          <AutoTranslateMarker
            targets={autoTranslate.targets}
            sourceLocale={autoTranslate.sourceLocale}
          />
        )}
      </div>

      <section className={styles.section}>
        <h5 className={styles.eyebrow}>Translate</h5>
        <CollectionTranslationForm
          form={form}
          onSubmit={handleSubmit}
          selectedCount={selectedCount}
          hasDrafts={hasDrafts}
          targetSelection={targetSelection}
        />
      </section>

      {showStatus && (
        <section className={`${styles.section} ${styles["section--status"]}`}>
          <h5 className={styles.eyebrow}>Status</h5>
          <CollectionTranslationProgress
            collection={collection}
            data={collectionTranslationApi.data}
            isPending={collectionTranslationApi.isPending}
          />
        </section>
      )}
    </CollectionTranslationPopup>
  );
}
