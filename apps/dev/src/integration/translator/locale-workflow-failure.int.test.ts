import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// A locale whose provider fails mid-run. Its own file because the failing provider is a property of
// the boot, and `getPayload` caches per process — a second boot in one file returns the first.

const rev = (s: string) => [...s].reverse().join("");

let failing: TestPayload;

beforeAll(async () => {
  failing = await bootTestPayload({
    runner: createPayloadJobsRunner({ autoRun: false }),
    failFor: ["fr"],
  });
});
afterAll(async () => {
  await failing?.cleanup();
});

describe("when one locale's provider fails", () => {
  it("stops there, leaves the locales after it untouched, and resumes on retry", async () => {
    const source = "Partial source";
    const doc = await failing.payload.create({
      collection: "docs" as "pages",
      locale: "en",
      data: { title: source, _status: "published" } as never,
    });
    const id = String(doc.id);

    const res = await callEndpoint(failing.payload, "post", "/translate/enqueue", {
      body: {
        source_lng: "en",
        target_lng: ["de", "fr"],
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    expect(res.status).toBe(200);

    await failing.payload.jobs.run({ queue: "translations", limit: 50 });

    const read = async (locale: string) =>
      (
        (await failing.payload.findByID({
          collection: "docs" as "pages",
          id,
          locale: locale as "en",
          fallbackLocale: false,
          draft: true,
        })) as Record<string, unknown>
      ).title;

    expect(await read("de"), "the locale before the failure should have landed").toBe(rev(source));
    expect(await read("fr"), "the failing locale should not have landed").toBeUndefined();

    // Payload backs a failed job off exponentially, so the picker would skip it for the next few
    // seconds. Clearing the delay lets the retry happen now rather than making the spec wait.
    const { docs } = await failing.payload.find({
      collection: "payload-jobs" as "pages",
      pagination: false,
      where: { workflowSlug: { equals: "translate_document_locales" } } as never,
    });
    await failing.payload.update({
      collection: "payload-jobs" as "pages",
      id: (docs[0] as { id: string | number }).id,
      data: { waitUntil: null, processing: false } as never,
    });

    // The retry must not translate `de` again — Payload's own task restoration skips a locale the
    // log already records as succeeded.
    const before = failing.translateCount();
    await failing.payload.jobs.run({ queue: "translations", limit: 50 });

    expect(failing.translateCount() - before, "de was translated a second time").toBe(1);
  });
});
