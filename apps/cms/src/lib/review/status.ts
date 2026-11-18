export const REVIEW_STATUS = {
  approved: "approved",
  inProgress: "in_progress",
  readyForReview: "ready_for_review",
} as const;

export const isAuthor = (user: unknown): boolean =>
  Boolean(user) && typeof user === "object" && (user as { role?: unknown }).role === "author";

export const relationId = (value: unknown): number | null => {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && "id" in value) {
    const { id } = value as { id: unknown };

    return typeof id === "number" ? id : null;
  }

  return null;
};
