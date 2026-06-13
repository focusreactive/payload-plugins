"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/core/lib/utils";
import { usePathname } from "@/i18n/navigation";

import { useBlogFilter } from "./BlogFilterProvider";

interface SearchOverlayProps {
  placeholder: string;
  activeCategory?: string;
  initialQuery?: string;
}

export function SearchOverlay({ placeholder, activeCategory, initialQuery }: SearchOverlayProps) {
  const [open, setOpen] = useState(false);
  const { navigate } = useBlogFilter();
  const pathname = usePathname();
  const t = useTranslations("blog.search");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();

    const params = new URLSearchParams();
    if (activeCategory) {
      params.set("category", activeCategory);
    }
    if (q) {
      params.set("q", q);
    }

    const queryString = params.toString();
    setOpen(false);
    navigate(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={t("open")}
          className={cn(
            "grid size-10 flex-none cursor-pointer place-items-center rounded-pill border border-border-strong text-muted-foreground",
            "transition-colors hover:border-foreground hover:text-foreground motion-reduce:transition-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          )}
        >
          <Search aria-hidden className="size-[17px]" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[200] bg-[rgba(6,14,13,0.5)] backdrop-blur-[3px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none"
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-[201] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none"
          )}
        >
          <Dialog.Title className="sr-only">{t("label")}</Dialog.Title>
          <form role="search" onSubmit={onSubmit} className="flex items-center gap-2.5 rounded-pill border border-border-strong bg-surface pl-[18px] pr-2 shadow-[0_30px_70px_-20px_rgba(6,14,13,0.6)]">
            <Search aria-hidden className="size-[18px] flex-none text-primary" />
            <label htmlFor="blog-search-input" className="sr-only">
              {t("label")}
            </label>
            <input
              id="blog-search-input"
              name="q"
              type="search"
              defaultValue={initialQuery}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent py-[15px] text-[1.05rem] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
            />
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t("close")}
                className={cn(
                  "grid size-9 flex-none cursor-pointer place-items-center rounded-pill bg-surface-muted text-foreground",
                  "transition-colors hover:bg-border-strong motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                )}
              >
                <X aria-hidden className="size-[15px]" />
              </button>
            </Dialog.Close>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
