"use client";

import { registerContentExtractors } from "@focus-reactive/payload-plugin-seo/content";
import type { ReactNode } from "react";

import extractPageContent from "@/collections/Page/extractPageContent";
import extractPostContent from "@/collections/Posts/extractPostContent";

registerContentExtractors({
  "@/collections/Page/extractPageContent#default": extractPageContent,
  "@/collections/Posts/extractPostContent#default": extractPostContent,
});

export function SeoExtractorRegistrar({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default SeoExtractorRegistrar;
