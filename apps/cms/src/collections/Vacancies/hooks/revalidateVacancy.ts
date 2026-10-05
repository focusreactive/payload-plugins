import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

import { cacheTag } from "@/lib/utils/cacheTags";
import { revalidateScopedTag } from "@/lib/utils/scopedCache";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import type { Locale } from "@/lib/types";
import type { Vacancy } from "@/payload-types";

function revalidateVacancyTags(slug: string, locale: Locale) {
  revalidateScopedTag(cacheTag({ locale, slug, type: "vacancy" }), "max");
  revalidateScopedTag(cacheTag({ locale, type: "vacanciesList" }), "max");
  revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
}

export const revalidateVacancy: CollectionAfterChangeHook<Vacancy> = ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context.disableRevalidate) {
    return doc;
  }
  const locale = getLocaleFromRequest(req);

  if (doc._status === "published") {
    revalidateVacancyTags(doc.slug, locale);
  }
  if (previousDoc?._status === "published" && previousDoc.slug !== doc.slug) {
    revalidateVacancyTags(previousDoc.slug, locale);
  }
  if (previousDoc?._status === "published" && doc._status !== "published") {
    revalidateVacancyTags(previousDoc.slug, locale);
  }
  return doc;
};

export const revalidateVacancyDelete: CollectionAfterDeleteHook<Vacancy> = ({ doc, req }) => {
  if (!req.context.disableRevalidate) {
    revalidateVacancyTags(doc.slug, getLocaleFromRequest(req));
  }
  return doc;
};
