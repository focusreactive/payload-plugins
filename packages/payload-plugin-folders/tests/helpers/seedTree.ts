import { generateNKeysBetween } from "payload/shared";
import type { Payload } from "payload";

import { createFolder, createPage } from "./treeFixtures.js";

type Row = { id: number };

export type SeededTree = {
  /** The folder the rename tests rename. */
  about: Row;
  /** `about`'s subfolders. */
  subfolders: Row[];
  /** Pages and posts directly or deeply inside `about`, by name. */
  pages: Record<string, Row>;
  /** A sibling tree no rename of `about` may touch. */
  blog: Row;
  blogPost: Row;
};

export type SeedTreeOptions = {
  /**
   * 20 subfolders under `about` holding 980 posts (49 each), the 1,000-descendant scenario of spec
   * section 5.5. The small tree is used when this is off.
   */
  large?: boolean;
};

const postsPerLargeSubfolder = 49;
const largeSubfolderCount = 20;

/**
 * Posts written without the plugin's hooks (`foldersInternal`), because the hooks would make 980
 * creates cost minutes. Each carries a title, a slug and an order key, which is all the tree reads.
 */
const createPostsInternally = async (
  payload: Payload,
  folderId: number,
  slugPrefix: string,
  count: number
): Promise<Row[]> => {
  const orderKeys = generateNKeysBetween(null, null, count);
  const posts: Row[] = [];
  for (let index = 0; index < count; index += 1) {
    posts.push(
      (await payload.create({
        collection: "posts",
        context: { foldersInternal: true },
        data: {
          folder: folderId,
          orderKey: orderKeys[index],
          slug: `${slugPrefix}-${index + 1}`,
          structureRevision: 0,
          title: `${slugPrefix} ${index + 1}`,
        },
        depth: 0,
        overrideAccess: true,
      })) as unknown as Row
    );
  }

  return posts;
};

/**
 * `/about` with a published page `contact`, a root page `about-us`, a draft page `members` in
 * `/about/team`, a post `timeline` in `/about/history`, and an unrelated `/blog/post`. With
 * `large` the subfolders are 20 flat folders under `about` and the pages are 980 posts.
 */
export const seedTree = async (
  payload: Payload,
  { large = false }: SeedTreeOptions = {}
): Promise<SeededTree> => {
  const about = await createFolder(payload, { name: "About", slug: "about" });
  const blog = await createFolder(payload, { name: "Blog", slug: "blog" });
  const blogPost = await createPage(payload, { folder: blog.id, slug: "post", title: "Post" });
  const pages: Record<string, Row> = {};
  const subfolders: Row[] = [];

  if (large) {
    for (let index = 1; index <= largeSubfolderCount; index += 1) {
      const slug = `section-${String(index).padStart(2, "0")}`;
      const subfolder = await createFolder(payload, { name: slug, parent: about.id, slug });
      subfolders.push(subfolder);
      await createPostsInternally(payload, subfolder.id, slug, postsPerLargeSubfolder);
    }

    return { about, blog, blogPost, pages, subfolders };
  }

  const team = await createFolder(payload, { name: "Team", parent: about.id, slug: "team" });
  const history = await createFolder(payload, {
    name: "History",
    parent: about.id,
    slug: "history",
  });
  subfolders.push(team, history);

  pages.contact = await payload.create({
    collection: "pages",
    data: { _status: "published", folder: about.id, slug: "contact", title: "Contact" } as never,
    depth: 0,
    overrideAccess: true,
  });
  pages["about-us"] = await payload.create({
    collection: "pages",
    data: {
      _status: "published",
      folder: about.id,
      isFolderRoot: true,
      slug: "about-us",
      title: "About us",
    } as never,
    depth: 0,
    overrideAccess: true,
  });
  pages.members = await payload.create({
    collection: "pages",
    data: { _status: "draft", folder: team.id, slug: "members", title: "Members" } as never,
    depth: 0,
    draft: true,
    overrideAccess: true,
  });
  pages.timeline = await payload.create({
    collection: "posts",
    data: { folder: history.id, slug: "timeline", title: "Timeline" },
    depth: 0,
    overrideAccess: true,
  });

  return { about, blog, blogPost, pages, subfolders };
};

/**
 * Removes every folder, page and post, at database level, so the next `seedTree` call in the same
 * file starts from an empty tree. Pages and posts go first because they point at folders.
 */
export const clearTree = async (payload: Payload): Promise<void> => {
  for (const collection of ["pages", "posts", "folders"] as const) {
    await payload.db.deleteMany({ collection, where: { id: { exists: true } } });
  }
  await payload.db.deleteVersions({ collection: "pages", where: { id: { exists: true } } });
};
