import type { VeIdentity } from "./shared.js";

import { VE_FOCUS_PARAM } from "./protocol.js";

export type BuildAdminEditUrlArgs = Omit<VeIdentity, "key"> & {
  locale?: string;
  adminBasePath?: string;
};

export type BuildAdminEditUrl = (args: BuildAdminEditUrlArgs) => string;

const TRAILING_SLASHES = /\/+$/u;

export const adminBaseOf = (adminBasePath: string): string =>
  adminBasePath.replace(TRAILING_SLASHES, "");

export const defaultBuildAdminEditUrl: BuildAdminEditUrl = ({
  docId,
  collectionSlug,
  kind,
  path,
  locale,
  adminBasePath = "/admin",
}) => {
  const admin = adminBaseOf(adminBasePath);
  const slug = encodeURIComponent(collectionSlug);
  const base =
    kind === "global"
      ? `${admin}/globals/${slug}`
      : `${admin}/collections/${slug}/${encodeURIComponent(String(docId))}`;
  const parts: string[] = [];
  if (path) parts.push(`${VE_FOCUS_PARAM}=${encodeURIComponent(path)}`);
  if (locale) parts.push(`locale=${encodeURIComponent(locale)}`);
  return parts.length ? `${base}?${parts.join("&")}` : base;
};
