"use client";

import { useDebounce } from "@uidotdev/usehooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SEARCH_CONFIG } from "@/lib/config/talks";

const DEBOUNCE_MS = 500;

interface SearchInputProps {
  defaultValue: string;
  placeholder: string;
}

export function SearchInput({ defaultValue, placeholder }: SearchInputProps) {
  const { replace } = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(defaultValue);
  const debouncedValue = useDebounce(value, DEBOUNCE_MS);
  const isFirstRender = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;

    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams);

    if (debouncedValue) {
      params.set(SEARCH_CONFIG.queryParam, debouncedValue);
    } else {
      params.delete(SEARCH_CONFIG.queryParam);
    }

    const query = params.toString();
    replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <svg
        aria-hidden
        className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-[clamp(16px,1.6vw,22px)] text-ink-42"
        fill="none"
        height="19"
        viewBox="0 0 18 18"
        width="19"
      >
        <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12.4 12.4L16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>

      <input
        className="h-[clamp(52px,4.4vw,64px)] w-full rounded-xl border border-ink-08 bg-card pr-[clamp(16px,1.6vw,22px)] pl-[clamp(48px,4.2vw,58px)] text-body-lg text-foreground shadow-lift outline-none transition-colors duration-[250ms] ease-out placeholder:text-ink-42 focus:border-primary motion-reduce:transition-none"
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        ref={inputRef}
        type="search"
        value={value}
      />
    </div>
  );
}
