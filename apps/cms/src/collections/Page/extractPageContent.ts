import type { ContentExtractor } from "@focus-reactive/payload-plugin-seo/content";

// WealthBriefing pages drive their SEO through the page meta fields rather than
// block-level body extraction, so no per-block content is emitted for analysis.
const extractPageContent: ContentExtractor = async () => [];

export default extractPageContent;
