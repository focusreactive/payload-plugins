"use client";

import { Search as SearchIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { RefObject } from "react";
import { cn } from "../utils";

interface SearchProps {
  className?: string;
  isActive: boolean;
  value?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder: string;
  onBlur: (event: React.FocusEvent<HTMLFormElement>) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

export function Search({
  className,
  isActive,
  value,
  inputRef,
  placeholder,
  onBlur,
  onChange,
  onClear,
  onKeyDown,
}: SearchProps) {
  const t = useTranslations("blog.search");

  const hideItemsClassName = cn(
    "transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none",
    isActive && "opacity-100",
    !isActive && "opacity-0 scale-75"
  );

  return (
    <form
      aria-hidden={!isActive}
      className={cn(
        "flex items-center justify-center h-10 gap-2.5 rounded-pill bg-transparent overflow-hidden border pl-4 pr-2",
        "transition-[width,opacity,border-color] duration-300 ease-out motion-reduce:transition-none",
        className,
        isActive && "w-full sm:w-[min(420px,100%)] border-border-strong opacity-100",
        !isActive && "w-10 border-transparent opacity-0"
      )}
      onBlur={onBlur}
      onSubmit={(event) => event.preventDefault()}
      role="search"
    >
      <SearchIcon aria-hidden className={cn("size-[17px] flex-none", hideItemsClassName)} />

      <label className={cn("sr-only", hideItemsClassName)} htmlFor="blog-search-input">
        {t("label")}
      </label>

      <input
        className={cn(
          "min-w-0 flex-1 bg-transparent h-full text-[1.05rem] text-foreground outline-none placeholder:text-muted-foreground",
          hideItemsClassName
        )}
        id="blog-search-input"
        name="q"
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        tabIndex={isActive ? 0 : -1}
        type="text"
        value={value}
      />

      <button
        aria-label={t("clear")}
        className={cn(
          "p-0.75 flex-none cursor-pointer rounded-pill bg-surface-muted text-foreground",
          "transition-colors hover:bg-border-strong motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          hideItemsClassName
        )}
        onClick={onClear}
        type="button"
      >
        <X aria-hidden className="size-[17px]" />
      </button>
    </form>
  );
}
