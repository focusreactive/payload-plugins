import { APIError } from 'payload';
import type { CollectionBeforeChangeHook } from 'payload';

import { BLOG_CONFIG } from "@/core/config/blog";
import { getLocaleFromRequest } from "@/core/lib/getLocaleFromRequest";
import { buildUrl } from "@/core/utils/path/buildUrl";
import type { Page } from "@/payload-types";

const RESERVED_SLUGS: readonly string[] = [BLOG_CONFIG.slug];

const generateErrorMessage = (slug: string) => `Slug "${slug}" is reserved and cannot be used for pages`;

export const validateReservedSlug: CollectionBeforeChangeHook<Page> = ({
  data,
}) => {
  if (!data?.slug) {
    console.log("No slug provided");
    return data;
  }

  if (RESERVED_SLUGS.includes(data.slug)) {
    throw new APIError(generateErrorMessage(data.slug), 400, undefined, true);
  }

  return data;
};

export const validateReservedPath: CollectionBeforeChangeHook<Page> = ({
  data,
  req,
}) => {
  if (!data) {
    return data;
  }

  const locale = getLocaleFromRequest(req);

  if (data.breadcrumbs) {
    const fullPath = buildUrl({
      absolute: false,
      breadcrumbs: data.breadcrumbs,
      collection: "page",
      locale,
    });

    if (fullPath) {
      const firstSegment = fullPath.split("/")[0];
      if (
        RESERVED_SLUGS.includes(firstSegment as (typeof RESERVED_SLUGS)[number])
      ) {
        throw new APIError(
          `Path "${fullPath}" starts with reserved slug "${firstSegment}" and cannot be used for pages`,
          400,
          undefined,
          true
        );
      }
    }
  }

  if (
    data.slug &&
    RESERVED_SLUGS.includes(data.slug as (typeof RESERVED_SLUGS)[number])
  ) {
    throw new APIError(generateErrorMessage(data.slug), 400, undefined, true);
  }

  req.payload?.logger?.info?.(`Validated reserved slug: ${data.slug}`);

  return data;
};
