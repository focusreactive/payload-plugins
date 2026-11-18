import { createComment } from "@focus-reactive/payload-plugin-comments";
import { ValidationError } from "payload";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from "payload";

import { isAuthor, relationId, REVIEW_STATUS } from "./status";

type Language = "en" | "es";

const MESSAGES = {
  approved: {
    en: (userId: number) => `@(${userId}) Approved. Ready to publish.`,
    es: (userId: number) => `@(${userId}) Aprobado. Listo para publicar.`,
  },
  approvedByAuthor: {
    en: "Only an admin can approve.",
    es: "Solo un administrador puede aprobar.",
  },
  readyForReview: {
    en: (userId: number) => `@(${userId}) Ready for review. Please take a look.`,
    es: (userId: number) => `@(${userId}) Listo para revisión. Por favor, revísalo.`,
  },
  reviewerRequired: {
    en: "Choose a reviewer to request a review.",
    es: "Elige un revisor para pedir una revisión.",
  },
} as const;

const languageOf = (req: PayloadRequest): Language => (req.i18n?.language === "es" ? "es" : "en");

/**
 * Enforced here rather than in field `validate`, because draft saves (and so every autosave) skip
 * field validation.
 */
export const enforceReviewRules: CollectionBeforeChangeHook = ({
  collection,
  data,
  originalDoc,
  req,
}) => {
  const status = data.reviewStatus ?? originalDoc?.reviewStatus;
  const previousStatus = originalDoc?.reviewStatus;
  const reviewer = relationId("reviewer" in data ? data.reviewer : originalDoc?.reviewer);
  const language = languageOf(req);

  if (
    status === REVIEW_STATUS.approved &&
    previousStatus !== REVIEW_STATUS.approved &&
    isAuthor(req.user)
  ) {
    throw new ValidationError({
      collection: collection.slug,
      errors: [{ message: MESSAGES.approvedByAuthor[language], path: "reviewStatus" }],
      req,
    });
  }

  if (status === REVIEW_STATUS.readyForReview && !reviewer) {
    throw new ValidationError({
      collection: collection.slug,
      errors: [{ message: MESSAGES.reviewerRequired[language], path: "reviewer" }],
      req,
    });
  }

  if (
    status === REVIEW_STATUS.readyForReview &&
    previousStatus !== REVIEW_STATUS.readyForReview &&
    req.user
  ) {
    data.reviewRequestedBy = req.user.id;
  }

  return data;
};

export const notifyReviewChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  req,
}) => {
  if (!req.user || doc.reviewStatus === previousDoc?.reviewStatus) {
    return doc;
  }

  const language = languageOf(req);
  let mentionedUserId: number | null = null;
  let text = "";

  if (doc.reviewStatus === REVIEW_STATUS.readyForReview) {
    mentionedUserId = relationId(doc.reviewer);
    text = mentionedUserId ? MESSAGES.readyForReview[language](mentionedUserId) : "";
  } else if (doc.reviewStatus === REVIEW_STATUS.approved) {
    mentionedUserId = relationId(doc.reviewRequestedBy);
    text = mentionedUserId ? MESSAGES.approved[language](mentionedUserId) : "";
  }

  if (!mentionedUserId) {
    return doc;
  }

  // The plugin's own create service, so the mention gets the same snapshot and email as one typed in the panel.
  const result = await createComment(
    { headers: req.headers, payload: req.payload, user: req.user },
    {
      collectionSlug: collection.slug,
      documentId: doc.id,
      mentionIds: [mentionedUserId],
      text,
    }
  );

  if (!result.success) {
    req.payload.logger.error({ err: result.error, msg: "Review notification comment failed" });
  }

  return doc;
};
