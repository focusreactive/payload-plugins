"use client";

import {
  registerContentExtractors,
  registerPreviewPathResolvers,
} from "@focus-reactive/payload-plugin-seo/content";
import type { ReactNode } from "react";

import extractPageContent from "@/collections/Page/extractPageContent";
import extractPostContent from "@/collections/Posts/extractPostContent";
import { SEO_PREVIEW_PATHS } from "@/lib/plugins/seo/previewPaths";

registerContentExtractors({
  "@/collections/Page/extractPageContent#default": extractPageContent,
  "@/collections/Posts/extractPostContent#default": extractPostContent,
});

registerPreviewPathResolvers(SEO_PREVIEW_PATHS);

export function SeoExtractorRegistrar({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default SeoExtractorRegistrar;
