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

  return (
    <a className="public-url-cell" href={`${siteUrl}${publicPath}`} rel="noopener" target="_blank">
      {publicPath}
    </a>
  );
};
