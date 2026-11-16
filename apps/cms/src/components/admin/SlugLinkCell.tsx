"use client";

import { useLocale } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";
import React from "react";

import { I18N_CONFIG } from "@/lib/config/i18n";

interface Props extends DefaultCellComponentProps {
  /** Which public route the slug belongs to. */
  routeKind: "page" | "post";
}

function publicPath(
  routeKind: Props["routeKind"],
  rowData: Record<string, unknown>
): string | null {
  const slug = typeof rowData.slug === "string" ? rowData.slug : null;

  if (!slug) {
    return null;
  }

  if (routeKind === "post") {
    return `/blog/${slug}`;
  }

  const breadcrumbs = Array.isArray(rowData.breadcrumbs)
    ? (rowData.breadcrumbs as { url?: string | null }[])
    : [];
  const url = breadcrumbs.at(-1)?.url ?? `/${slug}`;

  return url === "/home" ? "/" : url;
}

/** The slug as a link to the live page, opened in a new tab, so an editor checks a page in one click. */
export function SlugLinkCell({ cellData, rowData, routeKind }: Props) {
  const locale = useLocale();
  const path = publicPath(routeKind, rowData as Record<string, unknown>);

  if (!path) {
    return <span>{String(cellData ?? "")}</span>;
  }

  const prefix = locale.code === I18N_CONFIG.defaultLocale ? "" : `/${locale.code}`;
  const href = prefix && path === "/" ? prefix : `${prefix}${path}`;

  return (
    <a
      href={href}
      onClick={(event) => event.stopPropagation()}
      rel="noreferrer"
      style={{ color: "#2563eb", textDecoration: "underline" }}
      target="_blank"
    >
      {String(cellData ?? "")}
    </a>
  );
}
