import type { VeIdentity } from "../internal/shared.js";

export type BuildAdminEditUrlArgs = VeIdentity & {
  locale?: string;
  adminBasePath?: string;
};

export type BuildAdminEditUrl = (args: BuildAdminEditUrlArgs) => string;

export const defaultBuildAdminEditUrl: BuildAdminEditUrl = ({
  docId,
  collectionSlug,
  kind,
  path,
  locale,
  adminBasePath = "/admin",
}) => {
  const base =
    kind === "global"
      ? `${adminBasePath}/globals/${collectionSlug}`
      : `${adminBasePath}/collections/${collectionSlug}/${docId}`;
  const parts: string[] = [];
  if (path) parts.push(`veFocus=${encodeURIComponent(path)}`);
  if (locale) parts.push(`locale=${encodeURIComponent(locale)}`);
  return parts.length ? `${base}?${parts.join("&")}` : base;
};
