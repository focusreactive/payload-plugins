/**
 * Every collection the semantic index covers. Adding one here is three more edits, and missing any
 * of them fails silently rather than loudly: the `collection` select on the DocumentEmbeddings
 * collection (which is what the Postgres enum is generated from, so it needs a migration too),
 * a `getDocumentSearchData` branch (without it the row is fetched and then dropped, so the result
 * simply never appears), and the `SEARCH_GROUP_LABELS` map the results page reads.
 */
export type SearchCollection = "page" | "post" | "talk" | "topic";

export interface SearchRawItem {
  documentId: string;
  collection: SearchCollection;
  locale: string;
  score: number;
}

export interface SearchResultItem {
  documentId: string;
  collection: SearchCollection;
  title: string;
  slug: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  score: number;
}

export interface SearchResultGroup {
  collection: SearchCollection;
  items: SearchResultItem[];
  topScore: number;
}

export interface SearchResponse {
  groups: SearchResultGroup[];
}

/**
 * What a group of results is called on the page. Not derived from the collection slug: "talk" is a
 * developer's word for what a reader calls a teaching, and the archive is 14,000 items of which
 * only a slice are literally talks.
 */
export const SEARCH_GROUP_LABELS: Record<SearchCollection, string> = {
  page: "Pages",
  post: "Articles",
  talk: "Teachings",
  topic: "Topics",
};
