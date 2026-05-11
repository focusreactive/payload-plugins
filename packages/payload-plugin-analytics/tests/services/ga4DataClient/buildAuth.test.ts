import { describe, expect, it } from "vitest";
import { buildAuth } from "../../../src/services/ga4DataClient/buildAuth";

describe("buildAuth", () => {
  it("maps clientEmail + privateKey to snake_case", () => {
    expect(buildAuth({ clientEmail: "x@y.iam", privateKey: "PK" })).toEqual({
      client_email: "x@y.iam",
      private_key: "PK",
    });
  });
  it("preserves embedded newlines in privateKey verbatim", () => {
    const pk = "-----BEGIN-----\nLINE\n-----END-----";
    expect(buildAuth({ clientEmail: "x@y.iam", privateKey: pk })).toEqual({
      client_email: "x@y.iam",
      private_key: pk,
    });
  });
});
