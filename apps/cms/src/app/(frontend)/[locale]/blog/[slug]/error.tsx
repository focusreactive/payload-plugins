"use client";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Error loading post"
      message={`Failed to load post content: ${error.message}`}
      backLink={{
        href: BLOG_CONFIG.basePath,
        label: "Return to blog",
      }}
      wrapperClassName="pt-16 pb-16"
    />
  );
}
