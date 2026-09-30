import { describe, expect, it } from "vitest";

import { collectImageVariants } from "@/lib/adapters/collectImageVariants";
import {
  IMAGE_DEVICE_SIZES,
  IMAGE_MINIMUM_CACHE_TTL,
  IMAGE_QUALITY,
  resolveTransformWidth,
} from "@/lib/constants/imageDelivery.mjs";
import {
  blobHostname,
  mediaFileRedirects,
  mediaRemotePatterns,
} from "@/lib/constants/mediaDelivery.mjs";
import { readableAltFromFilename, validateMediaUpload } from "@/lib/hooks/validateMediaUpload";
import { absoluteMediaUrl, getMediaUrl } from "@/lib/utils/getMediaUrl";
import { withMediaVersion } from "@/lib/utils/mediaVersion";
import type { Media } from "@/payload-types";

const MB = 1024 * 1024;

describe("withMediaVersion", () => {
  it("appends filesize and keeps an existing query", () => {
    expect(withMediaVersion("https://blob.example/a.jpg", 1200)).toBe(
      "https://blob.example/a.jpg?v=1200"
    );
    expect(withMediaVersion("https://blob.example/a.jpg?x=1", 1200)).toBe(
      "https://blob.example/a.jpg?x=1&v=1200"
    );
  });

  it("leaves the url alone when filesize is missing", () => {
    expect(withMediaVersion("https://blob.example/a.jpg", null)).toBe("https://blob.example/a.jpg");
    expect(withMediaVersion("https://blob.example/a.jpg", undefined)).toBe(
      "https://blob.example/a.jpg"
    );
  });
});

describe("getMediaUrl", () => {
  it("keeps a direct Blob URL absolute", () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://cms.example";
    const blobUrl = "https://store.public.blob.vercel-storage.com/photo.jpg";

    expect(getMediaUrl(blobUrl)).toBe(blobUrl);
    expect(absoluteMediaUrl(blobUrl, 42)).toBe(`${blobUrl}?v=42`);
    expect(absoluteMediaUrl(blobUrl, 42).includes("cms.example")).toBe(false);
  });

  it("prefixes only relative urls", () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://cms.example";

    expect(absoluteMediaUrl("/api/media/file/photo.jpg", 10)).toBe(
      "https://cms.example/api/media/file/photo.jpg?v=10"
    );
  });
});

describe("resolveTransformWidth", () => {
  it("clamps an 800px original onto one cached width", () => {
    expect(resolveTransformWidth(640, 800)).toBe(640);
    expect(resolveTransformWidth(828, 800)).toBe(828);
    expect(resolveTransformWidth(1080, 800)).toBe(828);
    expect(resolveTransformWidth(2560, 800)).toBe(828);
  });

  it("keeps requested widths for a 2400px original", () => {
    expect(resolveTransformWidth(1920, 2400)).toBe(1920);
    expect(resolveTransformWidth(2560, 2400)).toBe(2560);
  });

  it("shares the optimizer width list with next.config", () => {
    expect(IMAGE_DEVICE_SIZES).toEqual([640, 828, 1080, 1280, 1920, 2560]);
    expect(IMAGE_QUALITY).toBe(85);
    expect(IMAGE_MINIMUM_CACHE_TTL).toBe(2_592_000);
  });
});

describe("media delivery config", () => {
  it("redirects legacy file urls to the public blob store", () => {
    expect(mediaFileRedirects(undefined)).toEqual([]);
    expect(mediaFileRedirects("https://store.public.blob.vercel-storage.com/")).toEqual([
      {
        destination: "https://store.public.blob.vercel-storage.com/:filename",
        permanent: true,
        source: "/api/media/file/:filename",
      },
    ]);
  });

  it("allows only the configured blob host in production", () => {
    const patterns = mediaRemotePatterns({
      blobBaseUrl: "https://abc123.public.blob.vercel-storage.com",
      nodeEnv: "production",
    });

    expect(blobHostname("https://abc123.public.blob.vercel-storage.com/")).toBe(
      "abc123.public.blob.vercel-storage.com"
    );
    expect(patterns).toEqual([
      { hostname: "abc123.public.blob.vercel-storage.com", protocol: "https" },
    ]);
    expect(JSON.stringify(patterns).includes("**")).toBe(false);
  });

  it("keeps localhost media patterns out of production", () => {
    const devPatterns = mediaRemotePatterns({ blobBaseUrl: undefined, nodeEnv: "development" });
    expect(devPatterns.every((pattern) => pattern.hostname === "localhost")).toBe(true);
    expect(mediaRemotePatterns({ blobBaseUrl: undefined, nodeEnv: "production" })).toEqual([]);
  });
});

describe("collectImageVariants", () => {
  it("keeps aspect-ratio sizes and versions them with the original filesize", () => {
    const media = {
      filesize: 2400,
      mimeType: "image/jpeg",
      sizes: {
        large: { url: "https://blob.example/large.jpg", width: 1400 },
        og: { url: "https://blob.example/og.jpg", width: 1200 },
        small: { url: "https://blob.example/small.jpg", width: 600 },
        square: { url: "https://blob.example/square.jpg", width: 500 },
        thumbnail: { url: "https://blob.example/thumb.jpg", width: 300 },
        xlarge: { url: "https://blob.example/xlarge.jpg", width: 1920 },
      },
      url: "https://blob.example/original.jpg",
      width: 2400,
    } as Media;

    const variants = collectImageVariants(media);

    expect(variants?.map((variant) => variant.width)).toEqual([300, 600, 1400, 1920, 2400]);
    expect(variants?.some((variant) => variant.url.includes("square.jpg"))).toBe(false);
    expect(variants?.some((variant) => variant.url.includes("og.jpg"))).toBe(false);
    expect(variants?.[0]?.url).toBe("https://blob.example/thumb.jpg?v=2400");
  });

  it("skips the ladder for svg and cropped preferred sizes", () => {
    const svg = { mimeType: "image/svg+xml", url: "/media/logo.svg", width: 100 } as Media;
    expect(collectImageVariants(svg)).toBeUndefined();

    const photo = {
      filesize: 10,
      mimeType: "image/jpeg",
      sizes: { square: { url: "/square.jpg", width: 500 } },
      url: "/original.jpg",
      width: 800,
    } as Media;
    expect(collectImageVariants(photo, "square")).toBeUndefined();
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
