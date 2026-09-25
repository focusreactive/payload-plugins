import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig, Config } from "payload";

import { translatorPlugin } from "./plugin.js";
import { createSyncRunner } from "./server/modules/task-runner/sync-runner/index.js";
import type { TranslationProvider } from "./core/domain/translation-providers/index.js";

const provider: TranslationProvider = { translate: vi.fn().mockResolvedValue({}) };

const posts: CollectionConfig = {
  slug: "posts",
  fields: [{ name: "title", type: "text", localized: true }],
};

const baseConfig = () =>
  ({
    collections: [posts],
    localization: { defaultLocale: "en", locales: ["en", "de"] },
  }) as unknown as Config;

const build = (extra: Record<string, unknown>) =>
  translatorPlugin({
    collections: [posts],
    translationProvider: provider,
    runner: createSyncRunner(),
    ...extra,
  } as never)(baseConfig());

// The endpoints write to the host's documents and spend money at the provider. Leaving them open is a
// decision a host may legitimately make, but it must be one they made — not one they inherited by not
// reading a table in the README.
describe("translatorPlugin — the endpoint access decision is not optional", () => {
  it("refuses to build a config when no decision was made", async () => {
    await expect(build({})).rejects.toThrow();
  });

  it("names both ways out in the refusal", async () => {
    const error = await build({}).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("access");
  });

  it("builds when a guard is supplied", async () => {
    const guard = { check: () => true };

    await expect(build({ access: guard })).resolves.toBeTruthy();
  });
});
