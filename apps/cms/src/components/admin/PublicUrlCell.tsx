"use client";

import { useLocale } from "@payloadcms/ui";
import type { DefaultCellComponentProps, UIFieldClient } from "payload";

import { getDocumentPath } from "@/lib/utils/path/getDocumentPath";
import { localizePath } from "@/lib/utils/path/localizePath";

interface PublicUrlCellProps extends DefaultCellComponentProps<UIFieldClient> {
  /** Public site origin, resolved on the server (see `publicUrlField`). */
  siteUrl: string;
}

export const PublicUrlCell = ({ collectionSlug, rowData, siteUrl }: PublicUrlCellProps) => {
  const { code: locale } = useLocale();

  const path = getDocumentPath({ relationTo: collectionSlug, value: rowData });
  if (!path) {
    return null;
  }

  const publicPath = localizePath(path, locale);

  const url = `${siteUrl}${publicPath}`;

  return (
    <a className="public-url-cell" href={url} rel="noopener" target="_blank" title={url}>
      {/* bdi keeps the path left-to-right inside the rtl box that clips long paths. */}
      <bdi>{publicPath}</bdi>
    </a>
  );
};
