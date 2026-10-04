"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "../utils";

interface SearchTriggerProps {
  open: () => void;
  isHidden: boolean;
}

export function SearchTrigger({ isHidden, open }: SearchTriggerProps) {
  const t = useTranslations("blog.search");
  return (
    <button
      type="button"
      aria-label={t("open")}
      inert={isHidden}
      className={cn(
        "size-11 self-start flex-none flex items-center justify-center rounded-pill bg-transparent border border-border-strong",
        "transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none",
        isHidden && "scale-75 opacity-0 pointer-events-none"
      )}
      onClick={open}
    >
      <SearchIcon aria-hidden className="size-[17px]" />
    </button>
  );
}
