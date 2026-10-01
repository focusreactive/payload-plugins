import { afterEach, describe, expect, it, vi } from "vitest";

import { protectOtherEnvironmentFilesOnDelete } from "@/lib/hooks/protectOtherEnvironmentFiles";

function deleteMedia(prefix: string) {
  const findByID = vi.fn().mockResolvedValue({ id: 1, prefix });
  return protectOtherEnvironmentFilesOnDelete({
    collection: { slug: "media" },
    id: 1,
    req: { payload: { findByID } },
  } as never);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("protectOtherEnvironmentFiles", () => {
  it("lets a preview delete only its own files", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feat-x");

    await expect(deleteMedia("")).rejects.toThrow(/belongs to another environment/u);
    await expect(deleteMedia("preview/feat-x")).resolves.toBeUndefined();
  });
});
