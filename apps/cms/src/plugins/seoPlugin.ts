import { seoPlugin } from "@payloadcms/plugin-seo";
import type {
  GenerateTitle,
  GenerateDescription,
  GenerateURL,
} from "@payloadcms/plugin-seo/types";

import { getLocaleFromRequest } from "@/core/lib/getLocaleFromRequest";
import { getServerSideURL } from "@/core/lib/getURL";
import { buildUrl } from "@/core/utils/path/buildUrl";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Page, Post } from "@/payload-types";

const generateTitle: GenerateTitle<Page | Post> = async ({ doc }) => {
  const settings = await getSiteSettings({});
  return doc.title || settings?.defaultOgTitle || "";
};

const generateDescription: GenerateDescription<Page | Post> = async ({
  doc,
}) => {
  const settings = await getSiteSettings({});
  return doc?.meta?.description || settings.defaultDescription || "";
};

const generateURL: GenerateURL<Page | Post> = async ({
  doc,
  collectionSlug,
  req,
}) => {
  const baseUrl = getServerSideURL();
  const locale = getLocaleFromRequest(req);
  switch (collectionSlug) {
    case "page": {
      const pageDoc = doc as Page;
      return buildUrl({
        breadcrumbs: pageDoc.breadcrumbs,
        collection: "page",
        locale,
      });
    }
    case "posts": {
      const postDoc = doc as Post;
      return buildUrl({ collection: "posts", locale, slug: postDoc?.slug });
    }
    default: {
      return baseUrl;
    }
  }
};

export default seoPlugin({
  generateDescription,
  generateTitle,
  generateURL,
});
