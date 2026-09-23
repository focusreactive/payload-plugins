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
export { searchPosts } from "./searchPosts";
export type { SearchPostsOptions } from "./searchPosts";

// Documents (generic)
export { getCachedDocument, getCachedDocumentByID } from "./getDocument";
export { getAllDocuments } from "./getAllDocuments";

// Globals
export { getCachedGlobal, formatGlobalCacheTag, revalidateGlobalTags } from "./getGlobals";
export { getSiteSettings } from "./getSiteSettings";
export { getBlogPageSettings } from "./getBlogPageSettings";
export type { BlogPageSettingsData } from "./getBlogPageSettings";
export { getAdminSettings } from "./getAdminSettings";
export { getNotFoundSettings } from "./getNotFoundSettings";

// Media
export { getDefaultMediaId, DEFAULT_MEDIA_CACHE_TAG } from "./getDefaultMediaId";

// Redirects
export { getRedirects, getCachedRedirects } from "./getRedirects";

// Localization
export { getAlternateLocales } from "./getAlternateLocales";

// Path map (route resolution, hreflang, sitemap, link renderer - see its own file header)
export { getPathMap, revalidatePathMap, PATH_MAP_CACHE_TAG } from "./pathMap";
export type { PathMap } from "./pathMap";

// Static params (route generation)
export { getMainSitePageStaticParams } from "./staticParams/pages";
export { getBlogPostStaticParams } from "./staticParams/posts";

// Article and person addresses under their listing pages
export {
  getInsightHref,
  getPersonHref,
  personSlug,
  resolveListingDetail,
} from "./getListingRoutes";
export type { ListingDetail } from "./getListingRoutes";
