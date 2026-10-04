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

/** Id of the page at `path` ("/" = home), looked up by its breadcrumb URL. */
export async function pageIdByPath(ctx: SeedContext, path: string): Promise<number | null> {
  if (pageIds.has(path)) {
    return pageIds.get(path) ?? null;
  }
  const result =
    path === "/"
      ? await ctx.payload.find({
          collection: "page",
          limit: 1,
          where: { slug: { equals: "home" } },
        })
      : await ctx.payload.find({
          collection: "page",
          limit: 1,
          where: { "breadcrumbs.url": { equals: path } },
        });
  const id = result.docs[0]?.id ?? null;
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
