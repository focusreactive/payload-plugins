"use client";

import { toast, useLocale } from "@payloadcms/ui";
import { useEffect, useMemo } from "react";

import {
  AutoTranslateMarker,
  buildTranslationStatusRows,
  deriveDocumentRunStatus,
  derivePanelStatus,
  TranslationsApi,
  TranslationStatusList,
} from "../../../entities/translation";
import type { AutoTranslateSummary } from "../../../entities/translation/model/autoTranslateSummary";
import type { TargetSelectionMode } from "../../../../types/TargetSelection";
import { OpenDocumentTranslationPopup } from "../../../features/open-document-translation-popup";
import { DocumentTranslationForm, FORM_FIELDS } from "../../../features/translate-document-form";
import type { FormValues } from "../../../features/translate-document-form";
import { DocumentTranslationFormModel } from "../../../features/translate-document-form/index.client";
import { handleFormError } from "../../../shared/lib/forms/handle-form-error";
import { useCollectionDocumentUrlParams } from "../../../shared/lib/payload/hooks/useCollectionDocumentUrlParams";

import styles from "./styles.module.scss";

type TranslateDocumentProps = {
  hasDrafts: boolean;
  autoTranslate: AutoTranslateSummary | null;
  targetSelection: TargetSelectionMode;
};

const TranslateDocument = ({
  hasDrafts,
  autoTranslate,
  targetSelection,
}: TranslateDocumentProps) => {
  const locale = useLocale();
  const params = useCollectionDocumentUrlParams();

  const queueTranslationApi = TranslationsApi.useQueueDocumentTranslation();
  const { data, error, isLoading } = TranslationsApi.useDocumentTranslation(params);
  const { data: staleness } = TranslationsApi.useDocumentStaleness(params);

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const staleLocales = useMemo(
    () => (staleness?.locales ?? []).filter((l) => l.is_stale).map((l) => l.target_lng),
    [staleness]
  );
  // The panel trigger shows one aggregate marker; the popup shows the full per-locale list.
  const panelStatus = useMemo(
    () => derivePanelStatus({ runStatus: deriveDocumentRunStatus(data), staleLocales }),
    [data, staleLocales]
  );
  const statusRows = useMemo(
    () => buildTranslationStatusRows({ staleness, runs: data }),
    [staleness, data]
  );

  const initialValues = useMemo(
    () => ({
      [FORM_FIELDS.SOURCE_LNG]: locale.code,
      // Multi mode binds an array; single mode a string. Seed the matching empty value.
      [FORM_FIELDS.TARGET_LNG]: targetSelection === "multi" ? [] : "",
      [FORM_FIELDS.HIDDEN_COLLECTION_SLUG]: params.collection,
      [FORM_FIELDS.HIDDEN_COLLECTION_ID]: params.id,
    }),
    [locale.code, params.collection, params.id, targetSelection]
  );

  const { form } = DocumentTranslationFormModel.useForm({ initialValues });

  const handleSubmit = async (formData: FormValues, onSuccess?: () => void) => {
    try {
      await queueTranslationApi.mutateAsync({
        ...formData,
        collection_id: [formData[FORM_FIELDS.HIDDEN_COLLECTION_ID]],
      });
      onSuccess?.();
    } catch (e) {
      handleFormError(e, form);
    }
  };

  // Vertical stack: title → Translate (form) → Status (unified per-locale list). No columns, no
  // corner chip — one consistent system so the popup stays calm as the plugin grows.
  return (
    <OpenDocumentTranslationPopup isLoading={isLoading} status={panelStatus}>
      {({ close }) => (
        <>
          <div className={styles.header}>
            <h4 className={styles.title}>Document translation</h4>
            {autoTranslate && (
              <AutoTranslateMarker
                targets={autoTranslate.targets}
                sourceLocale={autoTranslate.sourceLocale}
              />
            )}
          </div>

          <section className={styles.section}>
            <h5 className={styles.eyebrow}>Translate</h5>
            <DocumentTranslationForm
              form={form}
              onSubmit={(formData) => handleSubmit(formData, close)}
              hasDrafts={hasDrafts}
              targetSelection={targetSelection}
            />
          </section>

          {statusRows.length > 0 && (
            <section className={`${styles.section} ${styles["section--status"]}`}>
              <h5 className={styles.eyebrow}>Status</h5>
              <TranslationStatusList
                rows={statusRows}
                collection={params.collection}
                id={params.id}
              />
            </section>
          )}
        </>
      )}
    </OpenDocumentTranslationPopup>
  );
};

export default TranslateDocument;
