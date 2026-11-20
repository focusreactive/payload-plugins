import type { CollectionSlug, Payload, PayloadRequest, TypedUser } from "payload";

import { WorkflowError } from "../engine/errors.js";
import type { Subject } from "./store.js";

/**
 * Loads the subject document (latest draft). As a user: with their access, so a caller who cannot
 * read the document can neither see nor move its workflow. As the system (`user` null): with full
 * access, and `null` when it is gone.
 */
export const loadSubject = async (
  payload: Payload,
  subject: Subject,
  user: TypedUser | null,
  req: PayloadRequest
): Promise<Record<string, unknown> | null> => {
  const doc = await payload
    .findByID({
      collection: subject.collection as CollectionSlug,
      id: subject.id,
      depth: 0,
      draft: true,
      disableErrors: true,
      req,
      ...(user ? { overrideAccess: false, user } : { overrideAccess: true }),
    })
    .catch((error: unknown) => {
      // Access denied and not found read the same: the caller learns nothing about the document.
      const status = (error as { status?: number }).status;
      if (status === 403 || status === 404) {
        return null;
      }
      throw error;
    });
  if (!doc && user) {
    throw new WorkflowError(
      "unknown-subject",
      `There is no ${subject.collection} document "${subject.id}" you can read.`
    );
  }
  return (doc as Record<string, unknown> | null) ?? null;
};
