import { createPayloadJobsRunner } from "@focus-reactive/payload-plugin-translator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload, CRON_BATCH_LIMIT } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// Its own file: the failing provider is fixed at boot, and a boot is per process (see
// `bootTestPayload`).

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
        target_lng: ["de", "fr", "es"],
        collection_slug: "docs",
        collection_id: [id],
        strategy: "overwrite",
        publish_on_translation: false,
      },
    });
    expect(res.status).toBe(200);

    await failing.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

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
    expect(await read("es"), "the locale after the failure should be untouched").toBeUndefined();

    const { docs } = await failing.payload.find({
      collection: "payload-jobs" as "pages",
      pagination: false,
      where: { workflowSlug: { equals: "translate_document_locales" } } as never,
    });
    const log = (docs[0] as { log?: Array<{ state: string; input?: { target_lng?: string } }> })
      .log;
    expect(
      log?.map((entry) => [entry.input?.target_lng, entry.state]),
      "the job should record which locale failed, and attempt no locale after it"
    ).toEqual([
      ["de", "succeeded"],
      ["fr", "failed"],
    ]);

    const status = await callEndpoint(
      failing.payload,
      "get",
      "/translate/document/:collection_slug/:collection_id",
      { routeParams: { collection_slug: "docs", collection_id: id } }
    );
    const rows =
      (status.data as { data?: Array<{ status: string; input: { target_lng: string } }> }).data ??
      [];
    expect(
      rows.map((row) => [row.input.target_lng, row.status]).sort(),
      "each locale should report its own outcome"
    ).toEqual([
      ["de", "completed"],
      ["es", "pending"],
      ["fr", "failed"],
    ]);

    // Payload backs a failed job off exponentially, so the picker would skip it for the next few
    // seconds. Clearing the delay lets the retry happen now rather than making the spec wait.
    await failing.payload.update({
      collection: "payload-jobs" as "pages",
      id: (docs[0] as { id: string | number }).id,
      data: { waitUntil: null, processing: false } as never,
    });

    const before = failing.translateCount();
    await failing.payload.jobs.run({ queue: "translations", limit: CRON_BATCH_LIMIT });

    expect(
      failing.translateCount() - before,
      "the retry should attempt only the locale that failed"
    ).toBe(1);
  });
});
