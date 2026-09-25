export type SeoOverviewCollection = "page" | "insight" | "person";

export type SeoOverviewType = "Page" | "Service" | "Insight" | "Person";

export type SeoOverviewRow = {
  collection: SeoOverviewCollection;
  /** Why the signed-in user cannot save this row, written to them; null when they can. */
  editBlockedReason: string | null;
  hasDrafts: boolean;
  id: number | string;
  /** The newest version is a draft: never published, or carrying changes nobody has published. */
  latestIsDraft: boolean;
  path: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  title: string;
  type: SeoOverviewType;
};

export const SEO_TITLE_LIMIT = 60;
export const SEO_DESCRIPTION_LIMIT = 160;
