import { del } from "@vercel/blob";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteUnsavedUpload } from "@/lib/hooks/deleteUnsavedUpload";
import { readableAltFromFilename, validateMediaUpload } from "@/lib/hooks/validateMediaUpload";
import { getAbsoluteMediaUrl, getMediaUrl } from "@/lib/utils/getMediaUrl";
import type { Media } from "@/payload-types";

vi.mock("@vercel/blob", () => ({ del: vi.fn() }));

const MB = 1024 * 1024;

describe("getMediaUrl", () => {
  it("adds the file size as a version", () => {
    expect(getMediaUrl("https://store.public.blob.vercel-storage.com/a.jpg", 1200)).toBe(
      "https://store.public.blob.vercel-storage.com/a.jpg?v=1200"
    );
    expect(getMediaUrl("/api/media/file/a.jpg?x=1", 1200)).toBe("/api/media/file/a.jpg?x=1&v=1200");
  });

  it("keeps the url as is without a file size", () => {
    expect(getMediaUrl("/api/media/file/a.jpg", null)).toBe("/api/media/file/a.jpg");
    expect(getMediaUrl(undefined, 10)).toBe("");
  });
});

describe("getAbsoluteMediaUrl", () => {
  it("keeps blob urls on their own host", () => {
    expect(getAbsoluteMediaUrl("https://store.public.blob.vercel-storage.com/a.jpg", 42)).toBe(
      "https://store.public.blob.vercel-storage.com/a.jpg?v=42"
    );
  });

  it("prefixes relative urls with the server url", () => {
    vi.stubEnv("NEXT_PUBLIC_SERVER_URL", "https://cms.example");
    expect(getAbsoluteMediaUrl("/api/media/file/a.jpg", 10)).toBe(
      "https://cms.example/api/media/file/a.jpg?v=10"
    );
    vi.unstubAllEnvs();
  });
});

describe("deleteUnsavedUpload", () => {
  const callHook = (filename: string | undefined, savedDocs: number) => {
    const count = vi.fn().mockResolvedValue({ totalDocs: savedDocs });
    const req = {
      file: filename ? { name: filename } : undefined,
      payload: { count, logger: { error: vi.fn() } },
    };

    return deleteUnsavedUpload({
      collection: { slug: "media" },
      context: {},
      error: new Error("validation failed"),
      req,
    } as never);
  };

  beforeEach(() => {
    vi.mocked(del).mockReset();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_store_secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("deletes the uploaded file when no media doc uses it", async () => {
    await callHook("photo.jpg", 0);
    expect(del).toHaveBeenCalledWith("photo.jpg", expect.anything());
  });

  it("keeps the file when a media doc still uses it", async () => {
    await callHook("photo.jpg", 1);
    expect(del).not.toHaveBeenCalled();
  });

  it("does nothing when the request has no file", async () => {
    await callHook(undefined, 0);
    expect(del).not.toHaveBeenCalled();
  });

  it("does nothing when files are stored on local disk", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    await callHook("photo.jpg", 0);
    expect(del).not.toHaveBeenCalled();
  });
});

describe("validateMediaUpload", () => {
  it("turns a filename into alt text", () => {
    expect(readableAltFromFilename("campus-map-a1b2c3d4.jpg")).toBe("campus map");
    expect(readableAltFromFilename("photo.jpg")).toBe("photo");
  });

  it("fills a missing alt on create so the Blob object is not orphaned", () => {
    const result = validateMediaUpload({
      collection: {} as never,
      context: {},
      data: { filename: "campus-map-a1b2c3d4.jpg", filesize: 1200, mimeType: "image/jpeg" },
      operation: "create",
      req: {} as never,
    });

    expect(result?.alt).toBe("campus map");
  });

  it("rejects files over the shared limits", () => {
    expect(() =>
      validateMediaUpload({
        collection: {} as never,
        context: {},
        data: { filename: "scan.pdf", filesize: 140 * MB, mimeType: "application/pdf" },
        operation: "create",
        req: {} as never,
      })
    ).toThrow(/maximum is 100 MB/u);

    expect(() =>
      validateMediaUpload({
        collection: {} as never,
        context: {},
        data: { filename: "clip.mov", filesize: 10 * MB, mimeType: "video/quicktime" },
        operation: "create",
        req: {} as never,
      })
    ).toThrow(/MP4 or WebM/u);

    expect(() =>
      validateMediaUpload({
        collection: {} as never,
        context: {},
        data: { filename: "clip.mp4", filesize: 45 * MB, mimeType: "video/mp4" },
        operation: "create",
        req: {} as never,
      })
    ).toThrow(/maximum for video is 30 MB/u);
  });

  it("does not reject an existing oversized file when only metadata changes", () => {
    const result = validateMediaUpload({
      collection: {} as never,
      context: {},
      data: { alt: "Hello", filesize: 200 * MB, mimeType: "image/jpeg" },
      operation: "update",
      originalDoc: { filesize: 200 * MB } as Media,
      req: {} as never,
    });

    expect(result?.alt).toBe("Hello");
  });
});
