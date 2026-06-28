"use client";

import { useBlogFilter } from "@/app/(frontend)/[locale]/blog/_components/BlogPageContent/components/BlogFilterProvider";
import { blogHref } from "@/app/(frontend)/[locale]/blog/_components/BlogPageContent/utils/blogHref";
import { useEffect, useRef, useState } from "react";
import { cn } from "../utils";
import { Search } from "./Search";
import { FilterChips } from "./FilterChips";
import { SearchTrigger } from "./SearchTrigger";

const DEBOUNCE_MS = 300;

interface BlogActionsProps {
  categories: {
    title: string;
    slug: string;
  }[];
  placeholder: string;
  activeCategory?: string;
  initialQuery?: string;
}

export function BlogActions({
  categories,
  placeholder,
  activeCategory,
  initialQuery,
}: BlogActionsProps) {
  const { navigate } = useBlogFilter();

  const [open, setOpen] = useState(Boolean(initialQuery));
  const [value, setValue] = useState(initialQuery ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasQuery = value.trim().length > 0;

  const goTo = (query: string) => {
    navigate(blogHref({ category: activeCategory, q: query }));
  };

  const scheduleNavigate = (query: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => goTo(query), DEBOUNCE_MS);
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValue(next);
    scheduleNavigate(next.trim());
  };

  const onClear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    const hadQuery = hasQuery;
    setValue("");
    if (hadQuery) {
      goTo("");
    }
    inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && !hasQuery) {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const onBlur = (event: React.FocusEvent<HTMLFormElement>) => {
    if (hasQuery) {
      return;
    }
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  return (
    <div className="flex flex-col items-center mt-12 py-2">
      <div className={cn("flex sm:justify-center gap-5 mb-3")}>
        <FilterChips categories={categories} activeCategory={activeCategory} query={value} />

        <SearchTrigger open={() => setOpen(true)} isHidden={open} />
      </div>

      <Search
        inputRef={inputRef}
        isActive={open}
        value={value}
        placeholder={placeholder}
        onBlur={onBlur}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onClear={onClear}
      />
    </div>
  );
}
