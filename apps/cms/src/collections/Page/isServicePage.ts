import type { Page } from "@/payload-types";

// The Services section (demo-seed/route.ts PAGE_TREE) has no collection of its own: the overview
// page and every page nested under it (Patents, Trade marks, and the draft "Designs" awaiting
// review) are ordinary Page documents. Search still needs to tell them apart from a generic page,
// so a visitor searching "trade mark disputes" sees a Service result rather than a Page result.
// Breadcrumbs (from @payloadcms/plugin-nested-docs) carry the cumulative URL for every ancestor
// including the page itself, so matching on the "/services" (en/fr) or "/サービス" (ja) segment
// catches the overview page and any depth of page nested under it, in every locale, without
// hardcoding page titles or ids that an editor could rename.
const SERVICES_ROOT_SEGMENTS = ["/services", "/サービス"];

export function isServicePage(breadcrumbs: Page["breadcrumbs"]): boolean {
  if (!Array.isArray(breadcrumbs)) {
    return false;
  }

  return breadcrumbs.some((crumb) => {
    const url = crumb.url;
    if (!url) {
      return false;
    }
    return SERVICES_ROOT_SEGMENTS.some(
      (segment) => url === segment || url.startsWith(`${segment}/`)
    );
  });
}
