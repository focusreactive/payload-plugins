"use client";

import { registerContentExtractors } from "@focus-reactive/payload-plugin-seo/content";
import type { ReactNode } from "react";

import extractPageContent from "@/collections/Page/extractPageContent";
import extractPostContent from "@/collections/Posts/extractPostContent";
import extractTalkContent from "@/collections/extractTalkContent";
import extractTopicContent from "@/collections/extractTopicContent";

// Each key must match that collection's `extractContentPath` in lib/plugins/index.ts character for
// character: it is a key in a globalThis registry, not an import Payload resolves. A collection
// present on only one of the two sides resolves to no extractor, which is what makes the Generate
// button click with no request and no visible error.
registerContentExtractors({
  "@/collections/Page/extractPageContent#default": extractPageContent,
  "@/collections/Posts/extractPostContent#default": extractPostContent,
  "@/collections/extractTalkContent#default": extractTalkContent,
  "@/collections/extractTopicContent#default": extractTopicContent,
});

export function SeoExtractorRegistrar({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default SeoExtractorRegistrar;
