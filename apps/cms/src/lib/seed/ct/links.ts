import type { SeedContext } from "./context";

export type SeedLink =
  | {
      type: "reference";
      reference: { relationTo: "page"; value: number };
      label: string;
      newTab: false;
    }
  | { type: "custom"; url: string; label: string; newTab: boolean }
  | { type: "customPage"; customPage: "blog" | "search"; label: string; newTab: false };

const pageIds = new Map<string, number | null>();

/** Id of the page at `path` ("/" = home): matched by slug, confirmed by its last breadcrumb. */
export async function pageIdByPath(ctx: SeedContext, path: string): Promise<number | null> {
  if (pageIds.has(path)) {
    return pageIds.get(path) ?? null;
  }
  const slug = path === "/" ? "home" : (path.split("/").filter(Boolean).at(-1) ?? "home");
  const result = await ctx.payload.find({
    collection: "page",
    depth: 0,
    limit: 20,
    where: { slug: { equals: slug } },
  });
  // A breadcrumb trail lists every ancestor's URL, so only the last crumb identifies the page.
  const match = result.docs.find((doc) =>
    path === "/" ? doc.slug === "home" : doc.breadcrumbs?.at(-1)?.url === path
  );
  const id = match?.id ?? null;
  pageIds.set(path, id);
  return id;
}

export function forgetPage(path: string) {
  pageIds.delete(path);
}

/** A link field value: a reference when the page exists, otherwise a custom URL. */
export async function pageLink(ctx: SeedContext, path: string, label: string): Promise<SeedLink> {
  if (path === "/blog") {
    return { customPage: "blog", label, newTab: false, type: "customPage" };
  }
  const id = await pageIdByPath(ctx, path);
  return id
    ? { label, newTab: false, reference: { relationTo: "page", value: id }, type: "reference" }
    : { label, newTab: false, type: "custom", url: path };
}

export function urlLink(url: string, label: string, newTab = false): SeedLink {
  return { label, newTab, type: "custom", url };
}

/** For link fields built with `disableLabel` (header nav items and menu links): no label stored. */
export function withoutLabel(link: SeedLink): Omit<SeedLink, "label"> {
  const { label: _label, ...rest } = link;
  return rest;
}
