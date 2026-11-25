import { describe, expect, it } from "vitest";

import type { FieldFingerprints } from "../../content-projection/computeFieldFingerprints.js";
import type { RecordedFingerprints } from "../SourceFingerprint.js";
import { UNANSWERED } from "../SourceFingerprint.js";
import { asHash } from "./fixtures/claims.js";
import { leafVerdicts } from "../leafVerdicts.js";
import { driftedAddresses } from "../staleness.js";

const hashed = (fields: Record<string, string>): FieldFingerprints =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

describe("how each leaf of a receipt stands against the source as it is now", () => {
  const recorded: RecordedFingerprints = {
    ...hashed({ title: "1111", body: "2222" }),
    intro: UNANSWERED,
  };

  it("calls a leaf current when the receipt claims the hash the source has now", () => {
    expect(leafVerdicts(recorded, hashed({ title: "1111" }))).toStrictEqual({ title: "current" });
  });

  it("calls a leaf drifted when the receipt claims a different hash", () => {
    expect(leafVerdicts(recorded, hashed({ body: "9999" }))).toStrictEqual({ body: "drifted" });
  });

  it("calls a leaf unanswered when the run sent it and got nothing back", () => {
    expect(leafVerdicts(recorded, hashed({ intro: "3333" }))).toStrictEqual({
      intro: "unanswered",
    });
  });

  it("calls a leaf unrecorded when the receipt says nothing about it", () => {
    expect(leafVerdicts(recorded, hashed({ sub: "4444" }))).toStrictEqual({ sub: "unrecorded" });
  });

  it("answers for every leaf the source has now, and only those", () => {
    expect(
      leafVerdicts(recorded, hashed({ title: "1111", body: "9999", sub: "4444" }))
    ).toStrictEqual({ title: "current", body: "drifted", sub: "unrecorded" });
  });

  it("says nothing about a leaf the receipt recorded and the document no longer has", () => {
    expect(leafVerdicts(recorded, hashed({ title: "1111" }))).not.toHaveProperty("body");
  });

  it("answers nothing at all for a document with no translatable leaf", () => {
    expect(leafVerdicts(recorded, {})).toStrictEqual({});
  });

  it("calls every leaf unrecorded when the receipt recorded none", () => {
    expect(leafVerdicts({}, hashed({ title: "1111", body: "2222" }))).toStrictEqual({
      title: "unrecorded",
      body: "unrecorded",
    });
  });
});

describe("the admin's map and the run's filter are one computation", () => {
  const recorded: RecordedFingerprints = {
    ...hashed({ title: "1111", body: "2222" }),
    intro: UNANSWERED,
  };
  const current = hashed({ title: "1111", body: "9999", intro: "3333", sub: "4444" });

  it("owes exactly the leaves whose verdict is not current", () => {
    const verdicts = leafVerdicts(recorded, current);
    const owed = Object.keys(verdicts).filter((address) => verdicts[address] !== "current");

    expect([...driftedAddresses(recorded, current)].sort()).toStrictEqual(owed.sort());
  });

  it("owes nothing when every leaf is current", () => {
    const same = hashed({ title: "1111", body: "2222" });

    expect(driftedAddresses(same, same)).toStrictEqual([]);
  });
});
