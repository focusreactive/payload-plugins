import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createPayloadRequest } from "payload";
import type { PayloadRequest } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getChildren } from "../../src/server/index.js";
import { getTestPayload } from "../helpers/getTestPayload.js";
import type { TestPayload } from "../helpers/getTestPayload.js";
import { seedTree } from "../helpers/seedTree.js";

// A timing budget cannot share a machine with the integration files running in parallel forks: the
// same read that takes 13 ms alone took 389 ms among 26 of them. This file runs in its own vitest
// project, one file at a time (`npm run test:perf`), after the integration tests.

let harness: TestPayload;

beforeAll(async () => {
  harness = await getTestPayload();
});

afterAll(async () => {
  await harness?.destroy();
});

const asAdmin = async (): Promise<PayloadRequest> => {
  const { payload } = harness;
  const user = await payload.create({
    collection: "users",
    data: { email: "perf-admin@example.com", password: "test-password", role: "admin" } as never,
    overrideAccess: true,
  });

  return createPayloadRequest({
    payload,
    req: {},
    user: { ...user, collection: "users" } as never,
  });
};

describe("children p95", () => {
  it("children p95 is under 300 ms with the large seed", async () => {
    const { payload } = harness;
    const request = await asAdmin();
    const tree = await seedTree(payload, { large: true });
    const durations: number[] = [];

    // about holds 20 folders of 49 posts each: the child counts read 980 rows.
    for (let run = 0; run < 40; run += 1) {
      const startedAt = performance.now();
      const result = await getChildren(request, { limit: 100, parent: tree.about.id });
      durations.push(performance.now() - startedAt);
      expect(result.items).toHaveLength(20);
      expect(result.items.every((item) => item.childCount === 49)).toBe(true);
    }
    const sorted = [...durations].sort((left, right) => left - right);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    const medianMs = sorted[Math.floor(sorted.length / 2)];

    mkdirSync(path.resolve(import.meta.dirname, "../../.run"), { recursive: true });
    writeFileSync(
      path.resolve(import.meta.dirname, `../../.run/g9-children-p95-${harness.databaseKind}.json`),
      JSON.stringify({ medianMs, p95Ms: p95, runs: 40 })
    );
    process.stdout.write(
      `children p95 (${harness.databaseKind}, 40 runs): ${p95.toFixed(1)} ms, median ${medianMs.toFixed(1)} ms\n`
    );
    expect(p95).toBeLessThan(300);
  });
});
