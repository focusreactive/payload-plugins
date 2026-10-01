import { afterEach, describe, expect, it, vi } from "vitest";

import {
  protectOtherEnvironmentFilesOnDelete,
  protectOtherEnvironmentFilesOnReplace,
} from "@/lib/hooks/protectOtherEnvironmentFiles";
import { getMediaStoragePrefix } from "@/lib/storage/mediaStoragePrefix";

const OTHER_ENVIRONMENT_ERROR = /belongs to another environment/u;

function inPreview(branch: string) {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", branch);
}

function deleteMedia(prefix: string | null) {
  const findByID = vi.fn().mockResolvedValue({ id: 1, prefix });
  return protectOtherEnvironmentFilesOnDelete({
    collection: { slug: "media" },
    id: 1,
    req: { payload: { findByID } },
  } as never);
}

function replaceMediaFile(prefix: string | null) {
  return protectOtherEnvironmentFilesOnReplace({
    data: {},
    operation: "update",
    originalDoc: { prefix },
    req: { file: { name: "new.jpg" } },
  } as never);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getMediaStoragePrefix", () => {
  it("keeps production files at the store root", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getMediaStoragePrefix()).toBe("");
  });

  it("puts preview files under the branch name", () => {
    inPreview("Feat/New Hero_Block");
    expect(getMediaStoragePrefix()).toBe("preview/feat-new-hero-block");
  });

  it("puts local files under dev", () => {
    vi.stubEnv("VERCEL_ENV", "");
    expect(getMediaStoragePrefix()).toBe("dev");
  });
});

describe("protectOtherEnvironmentFiles", () => {
  it("blocks a preview from deleting a production file", async () => {
    inPreview("feat-x");
    await expect(deleteMedia("")).rejects.toThrow(OTHER_ENVIRONMENT_ERROR);
    await expect(deleteMedia(null)).rejects.toThrow(OTHER_ENVIRONMENT_ERROR);
  });

  it("lets a preview delete its own file", async () => {
    inPreview("feat-x");
    await expect(deleteMedia("preview/feat-x")).resolves.toBeUndefined();
  });

  it("lets production delete its own file", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    await expect(deleteMedia(null)).resolves.toBeUndefined();
  });

  it("blocks a preview from replacing a production file", () => {
    inPreview("feat-x");
    expect(() => replaceMediaFile("")).toThrow(OTHER_ENVIRONMENT_ERROR);
  });

  it("allows metadata edits on a production file in a preview", () => {
    inPreview("feat-x");
    const data = { alt: "New alt" };
    const result = protectOtherEnvironmentFilesOnReplace({
      data,
      operation: "update",
      originalDoc: { prefix: "" },
      req: {},
    } as never);
    expect(result).toBe(data);
  });
});
