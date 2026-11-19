"use client";

import {
  FormSubmit,
  useAuth,
  useConfig,
  useDocumentInfo,
  useForm,
  useLocale,
  useTranslation,
} from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

/**
 * The blog editor's visible save. Payload's own Save draft button is disabled whenever autosave has
 * just run, which reads as "cannot save"; this one always submits the draft and shows the toast.
 * Other roles keep autosave and Publish only.
 */
export function AuthorSaveDraftButton() {
  const { user } = useAuth();
  const {
    config: {
      routes: { api },
    },
  } = useConfig();
  const { collectionSlug, id, setUnpublishedVersionCount, uploadStatus } = useDocumentInfo();
  const { code: locale } = useLocale();
  const { submit } = useForm();
  const { t } = useTranslation();

  if ((user as { role?: string } | null)?.role !== "author" || !collectionSlug) {
    return null;
  }

  const saveDraft = async () => {
    const search = `?locale=${locale}&depth=0&fallback-locale=null&draft=true`;

    await submit({
      action: formatAdminURL({
        apiRoute: api,
        path: `/${collectionSlug}${id ? `/${id}` : ""}${search}`,
      }),
      method: id ? "PATCH" : "POST",
      overrides: { _status: "draft" },
      skipValidation: true,
    });
    setUnpublishedVersionCount((count) => count + 1);
  };

  return (
    <FormSubmit
      buttonId="action-save-draft"
      buttonStyle="secondary"
      className="save-draft"
      disabled={uploadStatus === "uploading"}
      onClick={() => void saveDraft()}
      size="medium"
      type="button"
    >
      {t("version:saveDraft")}
    </FormSubmit>
  );
}
