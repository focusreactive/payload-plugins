import { describe, it, expect } from "vitest";
import { APIError } from "payload";

import { killedTheCallersTransaction } from "./TransactionScope.shapes";

describe("killedTheCallersTransaction", () => {
  it("is true for a Payload error raised inside the caller's transaction", () => {
    expect(killedTheCallersTransaction({ transactionID: "tx-1" }, new APIError("rejected"))).toBe(
      true
    );
  });

  it("is false for a failure that reached no Payload operation", () => {
    expect(killedTheCallersTransaction({ transactionID: "tx-1" }, new Error("provider down"))).toBe(
      false
    );
  });

  it("is false when there is no caller transaction to destroy", () => {
    expect(killedTheCallersTransaction({}, new APIError("rejected"))).toBe(false);
  });

  it("is false when neither holds", () => {
    expect(killedTheCallersTransaction({}, new Error("provider down"))).toBe(false);
  });

  it("treats the MongoDB adapter's zero transaction id as a transaction", () => {
    expect(killedTheCallersTransaction({ transactionID: 0 }, new APIError("rejected"))).toBe(true);
  });
});
