import { describe, expect, it, vi } from "vitest";
import type { CollectionSlug, Payload } from "payload";

import { payloadForModules } from "../payloadForModules.js";
import type { RunTarget } from "../TranslationRun.interface.js";
import { ModuleWroteTheRunsOwnDocument } from "../ModuleWroteTheRunsOwnDocument.js";

const target: RunTarget = {
  collection: "posts" as CollectionSlug,
  documentId: "d1",
  sourceLocale: "en",
  targetLocale: "de",
};

function realPayload() {
  return {
    create: vi.fn().mockResolvedValue({ id: "x" }),
    update: vi.fn().mockResolvedValue({ id: "x" }),
    delete: vi.fn().mockResolvedValue({ id: "x" }),
    duplicate: vi.fn().mockResolvedValue({ id: "x" }),
    restoreVersion: vi.fn().mockResolvedValue({ id: "x" }),
    findByID: vi.fn().mockResolvedValue({ id: "d1" }),
    config: { serverURL: "http://localhost" },
  } as unknown as Payload;
}

describe("payloadForModules — what a chain module may do with the run's own document", () => {
  const writes = [
    ["create", (p: Payload) => p.create({ collection: "posts" } as never)],
    ["update", (p: Payload) => p.update({ collection: "posts" } as never)],
    ["delete", (p: Payload) => p.delete({ collection: "posts" } as never)],
    ["duplicate", (p: Payload) => p.duplicate({ collection: "posts" } as never)],
    ["restoreVersion", (p: Payload) => p.restoreVersion({ collection: "posts" } as never)],
  ] as const;

  it.each(writes)(
    "refuses `%s` on the collection the run is translating",
    async (operation, write) => {
      const real = realPayload();

      await expect(write(payloadForModules(real, target))).rejects.toBeInstanceOf(
        ModuleWroteTheRunsOwnDocument
      );
      expect(real[operation]).not.toHaveBeenCalled();
    }
  );

  it("lets a write to any other collection through", async () => {
    const real = realPayload();

    await payloadForModules(real, target).update({ collection: "provenance" } as never);

    expect(real.update).toHaveBeenCalled();
  });

  it("leaves reads alone, including of the document under translation", async () => {
    const real = realPayload();

    await payloadForModules(real, target).findByID({ collection: "posts", id: "d1" } as never);

    expect(real.findByID).toHaveBeenCalled();
  });

  it("keeps everything it does not guard reachable", () => {
    const real = realPayload();

    expect(payloadForModules(real, target).config.serverURL).toBe("http://localhost");
  });

  it("is marked to propagate, so a run inside a transaction stops rather than carries on", () => {
    expect(new ModuleWroteTheRunsOwnDocument("update", "posts").mustPropagate).toBe(true);
  });
});
