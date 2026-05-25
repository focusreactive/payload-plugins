// Public surface of the Domain Access Layer.
//
// Application code should import from `@/dal` (not from individual files
// inside this directory). Hooks, validate, and access functions live inside
// Payload's request lifecycle — they use `req.payload` directly, not the DAL.
// See ./README.md for the full pattern.

export { getPayloadClient } from "./payload-client";

// Pages
export { getPageBySlug } from "./getPageBySlug";

// Posts
export { getPostBySlug } from "./getPostBySlug";
export { getPosts } from "./getPosts";
export type { GetPostsOptions } from "./getPosts";
export { getRelatedPosts } from "./getRelatedPosts";

// Documents (generic)
export { getCachedDocument, getCachedDocumentByID } from "./getDocument";
export { getAllDocuments } from "./getAllDocuments";

// Globals
export {
  getCachedGlobal,
  formatGlobalCacheTag,
  revalidateGlobalTags,
} from "./getGlobals";
export { getSiteSettings } from "./getSiteSettings";
export { getBlogPageSettings } from "./getBlogPageSettings";
export type { BlogPageSettingsData } from "./getBlogPageSettings";

// Media
export {
  getDefaultMediaId,
  DEFAULT_MEDIA_CACHE_TAG,
} from "./getDefaultMediaId";

// Redirects
export { getRedirects, getCachedRedirects } from "./getRedirects";

// Localization
export { getAlternateLocales } from "./getAlternateLocales";

// Static params (route generation)
export { getMainSitePageStaticParams } from "./staticParams/pages";
export { getBlogPostStaticParams } from "./staticParams/posts";
