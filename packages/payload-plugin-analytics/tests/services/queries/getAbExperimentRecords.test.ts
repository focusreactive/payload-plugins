import { describe, expect, it, vi } from "vitest";
import {
  getAbExperimentRecords,
  getAbExperimentRecordByKey,
} from "../../../src/services/queries/getAbExperimentRecords";

const rows = [
  {
    manifestKey: "/en/about",
    parentDocId: "p1",
    parentCollection: "pages",
    locale: "en",
    startedAt: "2026-05-01",
  },
  {
    manifestKey: "/en/pricing",
    parentDocId: "p2",
    parentCollection: "pages",
    locale: "en",
    startedAt: "2026-04-20",
  },
];

function makeReq() {
  return {
    payload: {
      // Honor the `where: { manifestKey: { equals } }` filter the way Payload would,
      // so the by-key lookup returns the matching row rather than the first row.
      find: vi
        .fn()
        .mockImplementation(({ where }: { where?: { manifestKey?: { equals?: string } } }) => {
          const key = where?.manifestKey?.equals;
          return Promise.resolve({ docs: key ? rows.filter((r) => r.manifestKey === key) : rows });
        }),
    },
  };
}

describe("getAbExperimentRecords", () => {
  it("returns all lifecycle rows", async () => {
    const req = makeReq();
    const out = await getAbExperimentRecords("ab-experiments", req as never);
    expect(out).toHaveLength(2);
    expect(out[0].manifestKey).toBe("/en/about");
  });

  it("looks up a single row by manifestKey", async () => {
    const req = makeReq();
    const one = await getAbExperimentRecordByKey("ab-experiments", "/en/pricing", req as never);
    expect(one?.parentDocId).toBe("p2");
  });
});
