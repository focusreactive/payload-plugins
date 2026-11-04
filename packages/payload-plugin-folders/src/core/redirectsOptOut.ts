/**
 * The query parameter of a folder save through Payload's own route that opts the save out of
 * redirect rows, the way `redirects: false` does on a move request. Only the value `false` counts.
 * Kept apart from `redirects.ts` because the admin bundle imports this and must not pull in the
 * server code there.
 */
export const redirectsParameter = "frFoldersRedirects";

/** Whether a request's query opts its save out of redirect rows. It can never opt one in. */
export const readRedirectsOptOut = (query: unknown): boolean =>
  typeof query === "object" &&
  query !== null &&
  (query as Record<string, unknown>)[redirectsParameter] === "false";
