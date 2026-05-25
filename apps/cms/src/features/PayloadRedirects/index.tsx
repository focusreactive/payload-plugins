import { redirect, permanentRedirect } from "next/navigation";
import { notFound } from "next/navigation";
import type React from "react";

import { BLOG_CONFIG } from "@/core/config/blog";
import { canonicalRedirectFrom } from "@/core/lib/redirectUrl";
import type { Locale } from "@/core/types";
import { buildUrl } from "@/core/utils/path/buildUrl";
import { getCachedDocumentByID } from "@/dal/getDocument";
import { getCachedRedirects } from "@/dal/getRedirects";
import type { Page } from "@/payload-types";

interface Props {
  disableNotFound?: boolean;
  url: string;
  locale: Locale;
}

export const PayloadRedirects: React.FC<Props> = async ({
  disableNotFound,
  url,
  locale,
}) => {
  const redirects = await getCachedRedirects({ locale })();
  const canonicalUrl = canonicalRedirectFrom(url);
  const redirectItem = redirects.find(
    (r) => canonicalRedirectFrom(r.from) === canonicalUrl
  );

  if (!redirectItem || !redirectItem.isActive) {
    if (disableNotFound) {return null;}
    notFound();
  }

  let redirectUrl: string | null = null;

  if (redirectItem.to?.type === "custom") {
    redirectUrl = redirectItem.to?.url || null;
  } else if (
    redirectItem.to?.type === "reference" &&
    redirectItem.to?.reference
  ) {
    const { reference } = redirectItem.to;
    const collection = reference.relationTo;

    if (typeof reference.value === "number") {
      const document = (await getCachedDocumentByID(
        collection,
        reference.value
      )()) as Page | null;

      if (collection === "page" && document && "breadcrumbs" in document) {
        redirectUrl = buildUrl({
          breadcrumbs: document.breadcrumbs,
          collection: "page",
          locale,
        });
      } else if (
        collection === BLOG_CONFIG.collection &&
        document &&
        "slug" in document &&
        document.slug
      ) {
        redirectUrl = buildUrl({
          collection: "posts",
          locale,
          slug: document.slug,
        });
      } else if (
        document &&
        "slug" in document &&
        document.slug &&
        "breadcrumbs" in document
      ) {
        redirectUrl = buildUrl({
          breadcrumbs: document.breadcrumbs,
          collection: "page",
          locale,
        });
      }
    } else if (typeof reference.value === "object" && reference.value?.slug) {
      if (collection === "page" && "breadcrumbs" in reference.value) {
        redirectUrl = buildUrl({
          breadcrumbs: reference.value.breadcrumbs,
          collection: "page",
          locale,
        });
      } else if (collection === BLOG_CONFIG.collection) {
        redirectUrl = buildUrl({
          collection: "posts",
          locale,
          slug: reference.value.slug || "",
        });
      } else {
        redirectUrl = buildUrl({
          breadcrumbs: reference.value.breadcrumbs,
          collection: "page",
          locale,
        });
      }
    }
  }

  if (redirectUrl) {
    if (redirectItem.type === "308") {
      permanentRedirect(redirectUrl);
    } else {
      redirect(redirectUrl);
    }
  }

  if (disableNotFound) {return null;}
  notFound();
};
