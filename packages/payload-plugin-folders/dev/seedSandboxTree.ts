import { buildSegmentWhere } from "@focus-reactive/payload-plugin-folders";
import { moveItems } from "@focus-reactive/payload-plugin-folders/server";
import { generateNKeysBetween } from "payload/shared";
import type { Payload } from "payload";

import { devUser } from "./helpers/credentials.js";
import { ensureDevAdmin } from "./helpers/ensureDevAdmin.js";

export type SeedOptions = {
  /** Pages to add to one `archive` folder for load tests; 0 (default) adds none. */
  largePageCount?: number;
};

export type SeedSummary = {
  folders: Record<string, number>;
  largePageCount: number;
};

/** The password every seeded role user has; synthetic, for the local dev app only. */
export const seededUserPassword = devUser.password;

export const seededUsers = [
  { email: "editor@example.com", role: "editor" },
  { email: "drafter@example.com", role: "drafter" },
  { email: "limited@example.com", role: "editorLimited" },
] as const;

/** Keeps the seed's own setup writes from leaving redirect rows: only the moves and renames do. */
const setupContext = { foldersRedirects: false };

type FolderRow = { id: number };

type Translated = { de?: string; en: string };

const findFolderByPaths = async (payload: Payload, paths: string[]): Promise<FolderRow | null> => {
  const { docs } = await payload.find({
    collection: "folders",
    depth: 0,
    limit: 1,
    locale: "en",
    overrideAccess: true,
    pagination: false,
    where: { fullPath: { in: paths } },
  });

  return (docs[0] as unknown as FolderRow | undefined) ?? null;
};

type EnsureFolderArgs = {
  allowedTypes?: string[];
  /** Where to look before creating: the folder's path now, and any path it had while the seed was running. */
  knownPaths: string[];
  name: Translated;
  parent: number | null;
  slug: Translated;
};

const ensureFolder = async (payload: Payload, args: EnsureFolderArgs): Promise<FolderRow> => {
  const existing = await findFolderByPaths(payload, args.knownPaths);
  if (existing) {
    return existing;
  }
  const folder = (await payload.create({
    collection: "folders",
    context: setupContext,
    data: {
      allowedTypes: args.allowedTypes,
      defaultType: args.allowedTypes?.[0],
      name: args.name.en,
      parent: args.parent,
      slug: args.slug.en,
    } as never,
    depth: 0,
    locale: "en",
    overrideAccess: true,
  })) as unknown as FolderRow;
  if (args.slug.de) {
    await payload.update({
      collection: "folders",
      context: setupContext,
      data: { name: args.name.de ?? args.name.en, slug: args.slug.de },
      depth: 0,
      id: folder.id,
      locale: "de",
      overrideAccess: true,
    });
  }

  return folder;
};

type EnsurePageArgs = {
  collection: "pages" | "posts";
  /** `draft` stays a draft, `changed` is published and then edited into a newer draft. */
  condition?: "changed" | "draft" | "published";
  de?: { slug?: string; title: string };
  folder: number | null;
  isFolderRoot?: boolean;
  slug: string;
  title: string;
};

const findPage = async (payload: Payload, args: EnsurePageArgs): Promise<boolean> => {
  const { totalDocs } = await payload.count({
    collection: args.collection,
    locale: "en",
    overrideAccess: true,
    where: {
      and: [
        { folder: args.folder === null ? { exists: false } : { equals: args.folder } },
        args.isFolderRoot
          ? { isFolderRoot: { equals: true } }
          : {
              and: [
                { isFolderRoot: { not_equals: true } },
                buildSegmentWhere({ defaultLocale: "en", locale: "en", segment: args.slug }),
              ],
            },
      ],
    },
  });

  return totalDocs > 0;
};

const ensurePage = async (payload: Payload, args: EnsurePageArgs): Promise<void> => {
  if (await findPage(payload, args)) {
    return;
  }
  const condition = args.collection === "pages" ? (args.condition ?? "published") : "published";
  const isDraft = condition === "draft";
  const page = await payload.create({
    collection: args.collection,
    context: setupContext,
    data: {
      ...(args.collection === "pages" ? { _status: isDraft ? "draft" : "published" } : {}),
      folder: args.folder,
      isFolderRoot: args.isFolderRoot ?? false,
      slug: args.slug,
      title: args.title,
    } as never,
    depth: 0,
    draft: isDraft,
    locale: "en",
    overrideAccess: true,
  });
  if (args.de && args.collection === "pages") {
    await payload.update({
      collection: "pages",
      context: setupContext,
      data: {
        _status: isDraft ? "draft" : "published",
        slug: args.de.slug ?? args.slug,
        title: args.de.title,
      } as never,
      depth: 0,
      draft: isDraft,
      id: page.id,
      locale: "de",
      overrideAccess: true,
    });
  }
  if (condition === "changed") {
    await payload.update({
      collection: "pages",
      context: setupContext,
      data: { _status: "draft", title: `${args.title} (next version)` } as never,
      depth: 0,
      draft: true,
      id: page.id,
      locale: "en",
      overrideAccess: true,
    });
  }
};

const ensureUser = async (
  payload: Payload,
  user: { email: string; limitedFolder?: number; role: string }
): Promise<void> => {
  const { totalDocs } = await payload.count({
    collection: "users",
    overrideAccess: true,
    where: { email: { equals: user.email } },
  });
  if (totalDocs === 0) {
    await payload.create({
      collection: "users",
      data: { ...user, password: seededUserPassword } as never,
      overrideAccess: true,
    });
  }
};

const countPagesIn = async (payload: Payload, folder: number): Promise<number> =>
  (
    await payload.count({
      collection: "pages",
      locale: "en",
      overrideAccess: true,
      where: { folder: { equals: folder } },
    })
  ).totalDocs;

/**
 * Pages written without the plugin's hooks (`foldersInternal`), because 2,000 hooked creates take
 * minutes. Each carries a title, a segment and an order key, which is all the tree reads. The keys
 * continue after the largest one the folder has, so a re-run with a bigger count only appends.
 */
const addArchivePages = async (payload: Payload, folder: number, total: number): Promise<void> => {
  const existing = await countPagesIn(payload, folder);
  if (existing >= total) {
    return;
  }
  const { docs } = await payload.find({
    collection: "pages",
    depth: 0,
    limit: 1,
    locale: "en",
    overrideAccess: true,
    pagination: false,
    select: { orderKey: true },
    sort: "-orderKey",
    where: { and: [{ folder: { equals: folder } }, { orderKey: { exists: true } }] },
  });
  const lastKey = (docs[0] as { orderKey?: string | null } | undefined)?.orderKey ?? null;
  const missing = total - existing;
  const keys = generateNKeysBetween(lastKey, null, missing);

  for (let index = 0; index < missing; index += 1) {
    const number = String(existing + index + 1).padStart(4, "0");
    await payload.create({
      collection: "pages",
      context: { foldersInternal: true },
      data: {
        _status: "published",
        folder,
        orderKey: keys[index],
        pathSegment: `entry-${number}`,
        slug: `entry-${number}`,
        structureRevision: 0,
        title: `Archive entry ${number}`,
      } as never,
      depth: 0,
      locale: "en",
      overrideAccess: true,
    });
  }
};

/**
 * Builds the sandbox tree of the research (spec section 11.3), as a small site in English and
 * German, with synthetic content only:
 *
 * - a site root page, `blog/` (`aktuelles` in German) with a root page and an Article-only `2026/`,
 * - `products/` with a root page, and `shoes/running/`, created under `products/` and then moved
 *   to the top level with `moveItems`, so the moved URLs have redirect rows,
 * - `about/` with a root page and a `contact` page, then renamed to `company/` with a folder
 *   update, so `/about/contact` redirects to `/company/contact`,
 * - an empty folder, a draft page and a published page with a newer draft,
 * - a user for every role, and with `largePageCount` an `archive/` of that many pages.
 *
 * Every step looks for what it would create and skips it, so a second run changes nothing: no
 * row is written, and the tree revision stays where it was.
 */
export const seedSandboxTree = async (
  payload: Payload,
  { largePageCount = 0 }: SeedOptions = {}
): Promise<SeedSummary> => {
  await ensureDevAdmin(payload);

  const empty = await ensureFolder(payload, {
    knownPaths: ["/empty"],
    name: { de: "Leer", en: "Empty" },
    parent: null,
    slug: { en: "empty" },
  });

  // about/ is created, filled and renamed to company/.
  const company = await ensureFolder(payload, {
    knownPaths: ["/company", "/about"],
    name: { de: "Ueber uns", en: "About" },
    parent: null,
    slug: { de: "ueber-uns", en: "about" },
  });
  await ensurePage(payload, {
    collection: "pages",
    condition: "draft",
    folder: company.id,
    slug: "press-kit",
    title: "Press Kit",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Unser Team" },
    folder: company.id,
    slug: "our-team",
    title: "Our Team",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { slug: "kontakt", title: "Kontakt" },
    folder: company.id,
    slug: "contact",
    title: "Contact",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Ueber uns" },
    folder: company.id,
    isFolderRoot: true,
    slug: "about-us",
    title: "About Us",
  });
  const aboutRow = (await payload.findByID({
    collection: "folders",
    depth: 0,
    id: company.id,
    locale: "all",
    overrideAccess: true,
  })) as unknown as { slug: Record<string, string> };
  if (aboutRow.slug.en === "about") {
    await payload.update({
      collection: "folders",
      data: { name: "Company", slug: "company" },
      depth: 0,
      id: company.id,
      locale: "en",
      overrideAccess: true,
    });
  }
  if (aboutRow.slug.de === "ueber-uns") {
    await payload.update({
      collection: "folders",
      data: { name: "Unternehmen", slug: "unternehmen" },
      depth: 0,
      id: company.id,
      locale: "de",
      overrideAccess: true,
    });
  }

  // products/shoes/running is built under products/, then shoes/ moves to the top level.
  const products = await ensureFolder(payload, {
    knownPaths: ["/products"],
    name: { de: "Produkte", en: "Products" },
    parent: null,
    slug: { de: "produkte", en: "products" },
  });
  const shoes = await ensureFolder(payload, {
    knownPaths: ["/shoes", "/products/shoes"],
    name: { de: "Schuhe", en: "Shoes" },
    parent: products.id,
    slug: { de: "schuhe", en: "shoes" },
  });
  const running = await ensureFolder(payload, {
    knownPaths: ["/shoes/running", "/products/shoes/running"],
    name: { de: "Laufschuhe", en: "Running" },
    parent: shoes.id,
    slug: { de: "laufschuhe", en: "running" },
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Trail Blazer" },
    folder: running.id,
    slug: "trail-blazer",
    title: "Trail Blazer",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Fast Runner" },
    folder: running.id,
    slug: "fast-runner",
    title: "Fast Runner",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Laufschuhe" },
    folder: running.id,
    isFolderRoot: true,
    slug: "running-shoes",
    title: "Running Shoes",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Schuhe" },
    folder: shoes.id,
    isFolderRoot: true,
    slug: "shoes-overview",
    title: "Shoes",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Geschenkkarten" },
    folder: products.id,
    slug: "gift-cards",
    title: "Gift Cards",
  });
  await ensurePage(payload, {
    collection: "pages",
    condition: "changed",
    de: { title: "Preise" },
    folder: products.id,
    slug: "pricing",
    title: "Pricing",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Produkte" },
    folder: products.id,
    isFolderRoot: true,
    slug: "all-products",
    title: "Products",
  });
  const shoesRow = (await payload.findByID({
    collection: "folders",
    depth: 0,
    id: shoes.id,
    overrideAccess: true,
  })) as unknown as { parent: number | { id: number } | null };
  if (shoesRow.parent !== null) {
    // Lands directly after products/ at the top level.
    await moveItems(payload, {
      after: { collection: "folders", id: products.id },
      items: [{ collection: "folders", id: shoes.id }],
      overrideAccess: true,
    });
  }

  // blog/ is `aktuelles` in German, with an Article-only 2026/.
  const blog = await ensureFolder(payload, {
    knownPaths: ["/blog"],
    name: { de: "Aktuelles", en: "Blog" },
    parent: null,
    slug: { de: "aktuelles", en: "blog" },
  });
  const year = await ensureFolder(payload, {
    allowedTypes: ["posts"],
    knownPaths: ["/blog/2026"],
    name: { en: "2026" },
    parent: blog.id,
    slug: { en: "2026" },
  });
  await ensurePage(payload, {
    collection: "posts",
    folder: year.id,
    slug: "spring-update",
    title: "Spring Update",
  });
  await ensurePage(payload, {
    collection: "posts",
    folder: year.id,
    slug: "new-year",
    title: "New Year",
  });
  await ensurePage(payload, {
    collection: "pages",
    condition: "draft",
    de: { title: "Bald verfuegbar" },
    folder: blog.id,
    slug: "upcoming-launch",
    title: "Upcoming Launch",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Team" },
    folder: blog.id,
    slug: "team",
    title: "Team",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { slug: "hallo-welt", title: "Hallo Welt" },
    folder: blog.id,
    slug: "hello-world",
    title: "Hello World",
  });
  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Blog Startseite" },
    folder: blog.id,
    isFolderRoot: true,
    slug: "blog-home",
    title: "Blog Home",
  });

  await ensurePage(payload, {
    collection: "pages",
    de: { title: "Startseite" },
    folder: null,
    isFolderRoot: true,
    slug: "home",
    title: "Home",
  });

  for (const user of seededUsers) {
    await ensureUser(payload, {
      email: user.email,
      // An editorLimited user works only inside the blog.
      ...(user.role === "editorLimited" ? { limitedFolder: blog.id } : {}),
      role: user.role,
    });
  }

  let archiveId: number | null = null;
  if (largePageCount > 0) {
    const archive = await ensureFolder(payload, {
      knownPaths: ["/archive"],
      name: { en: "Archive" },
      parent: null,
      slug: { en: "archive" },
    });
    archiveId = archive.id;
    await addArchivePages(payload, archive.id, largePageCount);
  }

  return {
    folders: {
      blog: blog.id,
      company: company.id,
      empty: empty.id,
      products: products.id,
      running: running.id,
      shoes: shoes.id,
      year: year.id,
      ...(archiveId === null ? {} : { archive: archiveId }),
    },
    largePageCount,
  };
};
