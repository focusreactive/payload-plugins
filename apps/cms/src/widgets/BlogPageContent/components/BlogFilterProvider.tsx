"use client";

import { createContext, useContext, useState, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";

interface BlogFilterContextValue {
  isPending: boolean;
  pendingHref: string | null;
  navigate: (href: string) => void;
}

const BlogFilterContext = createContext<BlogFilterContextValue | null>(null);

export function BlogFilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const navigate = (href: string) => {
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return <BlogFilterContext value={{ isPending, pendingHref: isPending ? pendingHref : null, navigate }}>{children}</BlogFilterContext>;
}

export function useBlogFilter(): BlogFilterContextValue {
  const value = useContext(BlogFilterContext);
  if (!value) {
    throw new Error("useBlogFilter must be used within a BlogFilterProvider");
  }
  return value;
}
