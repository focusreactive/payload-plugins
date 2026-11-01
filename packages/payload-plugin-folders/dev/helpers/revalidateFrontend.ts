import { buildUrl } from "@focus-reactive/payload-plugin-folders/server";
import type { FoldersPluginOptions } from "@focus-reactive/payload-plugin-folders";
import { revalidatePath } from "next/cache.js";

/**
 * Spec section 10.3: every URL a path change touched is revalidated, the old one so its page
 * becomes a redirect and the new one so it appears. Stored paths carry no locale prefix, so each
 * goes through `buildUrl` like the frontend's own links.
 */
export const revalidateFrontend: NonNullable<
  NonNullable<FoldersPluginOptions["hooks"]>["afterPathChange"]
> = ({ changes }) => {
  const urls = new Set<string>();
  for (const change of changes) {
    for (const path of [change.from, change.to]) {
      if (path !== null) {
        urls.add(buildUrl(path, change.locale, { defaultLocale: "en" }));
      }
    }
  }
  for (const url of urls) {
    try {
      revalidatePath(url);
    } catch {
      // The seed and the repair CLI run outside Next, which has no cache to revalidate.
    }
  }
};
