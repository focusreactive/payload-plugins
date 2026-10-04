import type { SeedContext } from "./context";

export type MediaFolder = "Brand" | "Background" | "Covers" | "Avatars" | "Articles";

const folderIds = new Map<string, number>();

export async function ensureFolder(ctx: SeedContext, name: MediaFolder): Promise<number> {
  const cached = folderIds.get(name);
  if (cached) {
    return cached;
  }
  const found = await ctx.payload.find({
    collection: "payload-folders",
    limit: 1,
    where: { name: { equals: name } },
  });
  const id =
    found.docs[0]?.id ??
    (
      await ctx.payload.create({
        collection: "payload-folders",
        context: ctx.writeContext,
        data: { folderType: ["media"], name },
      })
    ).id;
  folderIds.set(name, id);
  return id;
}

const MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export interface MediaInput {
  /** Stable, unique file name — the idempotency key. */
  filename: string;
  data: Buffer;
  alt: string;
  folder: MediaFolder;
  defaultFor?: "platform_default"[];
}

/** Uploads once; later runs find the file by name and return its id ("created" flag tells which). */
export async function upsertMedia(
  ctx: SeedContext,
  input: MediaInput
): Promise<{ id: number; url: string; created: boolean }> {
  // Payload renames an upload whose file already exists on disk ("x.jpg" → "x-1.jpg"), e.g. a
  // fresh database over a kept media volume, so the stored name may carry a numeric suffix.
  const dot = input.filename.lastIndexOf(".");
  const base = dot === -1 ? input.filename : input.filename.slice(0, dot);
  const ext = dot === -1 ? "" : input.filename.slice(dot);
  const found = await ctx.payload.find({
    collection: "media",
    limit: 50,
    sort: "id",
    where: { filename: { like: base } },
  });
  const isSameFile = (name: string | null | undefined) =>
    name === input.filename ||
    (name?.startsWith(`${base}-`) &&
      name.endsWith(ext) &&
      /^\d+$/u.test(name.slice(base.length + 1, name.length - ext.length)));
  const existing = found.docs.find((doc) => isSameFile(doc.filename));
  if (existing) {
    return { created: false, id: existing.id, url: existing.url ?? "" };
  }
  const extension = input.filename.split(".").pop()?.toLowerCase() ?? "";
  const doc = await ctx.payload.create({
    collection: "media",
    context: ctx.writeContext,
    data: {
      alt: input.alt,
      defaultFor: input.defaultFor,
      folder: await ensureFolder(ctx, input.folder),
    },
    file: {
      data: input.data,
      mimetype: MIME[extension] ?? "application/octet-stream",
      name: input.filename,
      size: input.data.length,
    },
  });
  return { created: true, id: doc.id, url: doc.url ?? "" };
}
