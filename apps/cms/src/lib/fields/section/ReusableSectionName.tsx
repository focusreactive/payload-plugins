"use client";

import { useConfig, useField } from "@payloadcms/ui";
import { useEffect, useState } from "react";

const NAME_STYLE = {
  alignSelf: "center",
  color: "var(--theme-elevation-800)",
  flexShrink: 1,
  fontWeight: 500,
  marginLeft: "8px",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

type Reference = number | string | { id?: number | string; title?: string } | null | undefined;

const idOf = (value: Reference): number | string | undefined =>
  typeof value === "object" ? value?.id : (value ?? undefined);

/**
 * The name of the reusable section a "Reusable section" row points to. The row card can only
 * show the relationship's id, so this reads the referenced document's title once per id.
 */
export function ReusableSectionName({ path }: { path: string }) {
  const { value } = useField<Reference>({ path });
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig();
  const [title, setTitle] = useState<string>();
  const id = idOf(value);
  const inlineTitle = typeof value === "object" ? value?.title : undefined;

  useEffect(() => {
    if (id === undefined || inlineTitle) {
      return;
    }
    const controller = new AbortController();
    const loadTitle = async () => {
      try {
        const response = await fetch(
          `${serverURL}${api}/globalBlock/${id}?depth=0&select[title]=true`,
          { credentials: "include", signal: controller.signal }
        );
        const doc = response.ok ? ((await response.json()) as { title?: string }) : undefined;
        setTitle(doc?.title);
      } catch {
        // Aborted or not readable: the row keeps showing the section type only.
      }
    };
    void loadTitle();
    return () => controller.abort();
  }, [api, id, inlineTitle, serverURL]);

  const name = inlineTitle ?? title;
  return name ? <span style={NAME_STYLE}>{name}</span> : null;
}
