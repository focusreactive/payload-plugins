/**
 * Shape of a single post as returned by the real Passle API
 * (GET /api/v2/passlesync/posts/{PostShortcode}), per
 * https://api-docs.passle.net/api-endpoints.
 *
 * Field casing and names for the top-level post match the documented
 * sample response exactly. The inner shape of each entry in `Authors` is
 * not fully documented on that page; `Name` and `EmailAddress` are inferred
 * from Passle's own PascalCase convention used everywhere else in the
 * response, not confirmed against a full live sample.
 */
export interface PasslePostAuthor {
  EmailAddress?: string;
  ImageUrl?: string;
  JobTitle?: string;
  Name: string;
  ProfileUrl?: string;
}

export interface PasslePostPayload {
  Authors: PasslePostAuthor[];
  CoAuthors?: PasslePostAuthor[];
  ContentTextSnippet: string;
  PostContentHtml: string;
  PostShortcode: string;
  PostTitle: string;
  PostUrl: string;
  /** ISO 8601 timestamp. */
  PublishedDate: string;
  Tags?: string[];
}
