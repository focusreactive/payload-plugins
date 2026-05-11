import { describe, expect, it } from "vitest";
import { decodeSessionId, encodeSessionId, type SessionSignature } from "../../../src/utils/ga4/sessionSignature";

const SAMPLE: SessionSignature = {
  dhm: "202605101430",
  src: "google",
  dev: "desktop",
  ctr: "United States",
  lp: "/landing?utm_source=x",
};

describe("sessionSignature", () => {
  it("round-trips a signature lossless", () => {
    expect(decodeSessionId(encodeSessionId(SAMPLE))).toEqual(SAMPLE);
  });

  it("preserves values containing special characters (slashes, query, unicode)", () => {
    const sig: SessionSignature = { dhm: "202605101430", src: "(direct)", dev: "mobile", ctr: "Россия", lp: "/blog/post?id=1&x=2" };
    expect(decodeSessionId(encodeSessionId(sig))).toEqual(sig);
  });

  it("returns null for a non-base64 string", () => {
    expect(decodeSessionId("not-a-valid-id")).toBeNull();
  });

  it("returns null when decoded payload is missing a required field", () => {
    const partial = Buffer.from(JSON.stringify({ dhm: "x", src: "y" })).toString("base64");
    expect(decodeSessionId(partial)).toBeNull();
  });
});
