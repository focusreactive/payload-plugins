import { describe, expect, it, vi } from "vitest";

import { TransportError } from "../../../../translation-providers/shared/errors/index.js";
import { PermissionCheckFailed } from "../../../features/translate-document/PermissionCheckFailed.js";
import { swallowOrThrow } from "../swallowOrThrow.js";

const IN_A_TRANSACTION = { transactionID: "tx-1" };
const NO_TRANSACTION = {};

describe("swallowOrThrow", () => {
  it("returns what the work returned, and does not call onFailure", async () => {
    const onFailure = vi.fn();

    const result = await swallowOrThrow(IN_A_TRANSACTION, async () => "the value", onFailure);

    expect(result).toBe("the value");
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("swallows when the caller has no transaction, whatever failed", async () => {
    const foreign = new Error("a Payload operation blew up");

    const result = await swallowOrThrow(
      NO_TRANSACTION,
      () => Promise.reject(foreign),
      () => undefined
    );

    expect(result, "swallowed is reported as an absent value").toBeUndefined();
  });

  it("lets a foreign failure out when the caller is in a transaction", async () => {
    const foreign = new Error("a Payload operation blew up");

    await expect(
      swallowOrThrow(
        IN_A_TRANSACTION,
        () => Promise.reject(foreign),
        () => undefined
      ),
      "an error we did not raise may have taken the caller's transaction with it"
    ).rejects.toBe(foreign);
  });

  it("swallows one of ours that ran no Payload operation, even in a transaction", async () => {
    const result = await swallowOrThrow(
      IN_A_TRANSACTION,
      () => Promise.reject(new TransportError("provider down")),
      () => undefined
    );

    expect(result).toBeUndefined();
  });

  it("lets one of ours out when it declares the caller's work already gone", async () => {
    const ours = new PermissionCheckFailed("an access rule threw");

    await expect(
      swallowOrThrow(
        IN_A_TRANSACTION,
        () => Promise.reject(ours),
        () => undefined
      )
    ).rejects.toBe(ours);
  });

  it("calls onFailure with the error even when it then lets it out", async () => {
    const foreign = new Error("a Payload operation blew up");
    const onFailure = vi.fn();

    await expect(
      swallowOrThrow(IN_A_TRANSACTION, () => Promise.reject(foreign), onFailure)
    ).rejects.toBe(foreign);

    expect(onFailure, "the caller logs its own failure either way").toHaveBeenCalledWith(foreign);
  });

  it("reads the transaction before the work, because a rollback deletes it", async () => {
    // What Payload does: killTransaction.js:11 does `delete req.transactionID` after rolling back.
    const scope: { transactionID?: string } = { transactionID: "tx-1" };
    const foreign = new Error("a Payload operation blew up");

    await expect(
      swallowOrThrow(
        scope,
        () => {
          delete scope.transactionID;
          return Promise.reject(foreign);
        },
        () => undefined
      ),
      "read at the catch instead of at entry, the rollback would hide that there was a transaction"
    ).rejects.toBe(foreign);
  });
});
