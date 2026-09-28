"use client";

import {
  FormSubmit,
  PublishButton,
  UnpublishButton,
  useAuth,
  useConfig,
  useDocumentInfo,
  useForm,
  useLocale,
} from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

import type { User } from "@/payload-types";

/**
 * Payload's own publish button marks the document published in the browser as soon as the save
 * returns, so after a fee-earner's submission the header said "Published" until a reload, while the
 * server had kept the change in a draft. This sends the same publish request, which the Person
 * collection's hooks turn into a submitted draft, and counts it as an unpublished change instead.
 */
const SubmitForReviewButton = () => {
  const {
    config: {
      routes: { api },
    },
  } = useConfig();
  const { collectionSlug, id, setUnpublishedVersionCount, uploadStatus } = useDocumentInfo();
  const { submit } = useForm();
  const { code: locale } = useLocale();

  const submitForReview = async () => {
    if (!collectionSlug || !id || uploadStatus === "uploading") return;
    await submit({
      action: formatAdminURL({
        apiRoute: api,
        path: `/${collectionSlug}/${id}?locale=${locale}&depth=0&fallback-locale=null&draft=true`,
      }),
      method: "PATCH",
      overrides: { _status: "published" },
    });
    setUnpublishedVersionCount((count) => count + 1);
  };

  return (
    <FormSubmit buttonId="action-save" onClick={submitForReview} size="medium" type="button">
      Submit for review
    </FormSubmit>
  );
};

/**
 * The rule that a fee-earner's change waits for an editor lives in the Person collection's hooks;
 * the button only changes what the fee-earner is told.
 */
export const PublishOrSubmitForReview = () => {
  const { user } = useAuth<User>();
  if (user?.role === "feeEarner") return <SubmitForReviewButton />;
  return <PublishButton />;
};

export const UnpublishForEditorsOnly = () => {
  const { user } = useAuth<User>();
  if (user?.role === "feeEarner") return null;
  return <UnpublishButton />;
};
