import type { FieldHook } from "payload";

import type { Page } from "@/payload-types";

export const syncCurrentBreadcrumbUrl: FieldHook<Page, Page["breadcrumbs"]> = ({ data, value }) => {
  const currentCrumb = value?.at(-1);
  const slug = data?.slug;

  if (!value || !currentCrumb || !slug) {
    return value;
  }

  const parentUrl = value.at(-2)?.url ?? "";

  return [...value.slice(0, -1), { ...currentCrumb, url: `${parentUrl}/${slug}` }];
};
