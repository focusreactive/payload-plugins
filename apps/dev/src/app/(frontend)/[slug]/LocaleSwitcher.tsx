"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useId } from "react";

import { LOCALES } from "./locales";
import type { LocaleCode } from "./locales";

// A native <select> keeps the OS picker on touch devices; `appearance: none` only removes the
// chrome, so the arrow has to be drawn back in as a background image. Its colour is baked into the
// SVG because a data URI cannot read a CSS variable — `--theme-elevation-250` as of writing.
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath fill='rgb(87,87,87)' d='M0 0h10L5 6z'/%3E%3C/svg%3E\")";

export function LocaleSwitcher({ current }: { current: LocaleCode }) {
  const router = useRouter();
  const id = useId();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const select = (code: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("locale", code);
    // Client navigation: the server re-renders with the new locale, so the published-only filter
    // and the locale fallbacks stay exactly as they are for a real visitor.
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "calc(var(--base) * 0.5)",
        padding: "calc(var(--base) * 0.6) calc(var(--base) * 1.7)",
      }}
    >
      <label
        htmlFor={id}
        style={{ fontSize: 13, letterSpacing: "0.04em", color: "var(--theme-elevation-250)" }}
      >
        Language
      </label>
      <select
        id={id}
        value={current}
        onChange={(event) => select(event.target.value)}
        disabled={pending}
        style={{
          appearance: "none",
          padding:
            "calc(var(--base) * 0.3) calc(var(--base) * 1.5) calc(var(--base) * 0.3) calc(var(--base) * 0.6)",
          borderRadius: "var(--style-radius-m)",
          border: "1px solid var(--theme-border-color)",
          background: `${CHEVRON} no-repeat right calc(var(--base) * 0.6) center, var(--theme-elevation-0)`,
          backgroundSize: "10px 6px",
          color: "var(--theme-elevation-800)",
          font: "inherit",
          fontSize: 14,
          lineHeight: 1.2,
          cursor: pending ? "progress" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {LOCALES.map(({ code, label }) => (
          <option
            key={code}
            value={code}
            style={{
              background: "var(--theme-elevation-100)",
              color: "var(--theme-elevation-800)",
            }}
          >
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
