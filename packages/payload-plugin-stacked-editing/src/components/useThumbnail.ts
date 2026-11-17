"use client";

import { useConfig } from "@payloadcms/ui";
import { useEffect, useState } from "react";

import type { PreviewMedia } from "../lib/preview.js";

/** Resolved thumbnail URLs by `collection/id`, shared by every card on the page. */
const cache = new Map<string, Promise<string | null>>();

type UploadDoc = {
  url?: string | null;
  mimeType?: string | null;
  sizes?: Record<string, { url?: string | null } | undefined>;
};

const pickUrl = (doc: UploadDoc): string | null => {
  if (doc.mimeType && !doc.mimeType.startsWith("image/")) {
    return null;
  }
  return doc.sizes?.thumbnail?.url || doc.url || null;
};

const loadThumbnail = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { credentials: "include" });
    return response.ok ? pickUrl((await response.json()) as UploadDoc) : null;
  } catch {
    return null;
  }
};

const fetchThumbnail = (apiBase: string, relationTo: string, id: number | string) => {
  const key = `${relationTo}/${id}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = loadThumbnail(`${apiBase}/${relationTo}/${encodeURIComponent(String(id))}?depth=0`);
    cache.set(key, pending);
  }
  return pending;
};

/**
 * The thumbnail URL for a card's media: given as a URL, or an upload id resolved through the REST
 * API (`sizes.thumbnail` when the collection has it). `undefined` while loading, `null` for none.
 */
export const useThumbnail = (media: PreviewMedia | undefined): string | null | undefined => {
  const {
    config: { routes, serverURL },
  } = useConfig();
  const apiBase = `${serverURL ?? ""}${routes.api}`;
  const key = media?.kind === "doc" ? `${media.relationTo}/${media.id}` : media?.url;
  const [state, setState] = useState<{ key?: string; url: string | null | undefined }>({
    url: media?.kind === "url" ? media.url : undefined,
  });

  useEffect(() => {
    if (!media) {
      setState({ key, url: null });
      return;
    }
    if (media.kind === "url") {
      setState({ key, url: media.url });
      return;
    }
    let active = true;
    setState({ key, url: undefined });
    const load = async () => {
      const url = await fetchThumbnail(apiBase, media.relationTo, media.id);
      if (active) {
        setState({ key, url });
      }
    };
    void load();
    return () => {
      active = false;
    };
    // `key` identifies `media`.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, key]);

  return state.key === key ? state.url : media ? undefined : null;
};
