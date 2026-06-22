import { PLUGIN_NAME } from "../constants";

interface Item {
  slug: string;
}

export function warnUnknownSlugs(
  slugs: string[],
  items: Item[] | undefined,
  type: "collection" | "global"
) {
  for (const slug of slugs) {
    if (!items?.find((item) => item.slug === slug)) {
      console.warn(`[${PLUGIN_NAME}] Unknown ${type} slug: "${slug}"`);
    }
  }
}
