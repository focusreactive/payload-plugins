import { describe, expect, it, vi } from "vitest";

import { identityOf } from "../identityOf.js";

const ONE = ["users"];
const TWO = ["admins", "editors"];

describe("identityOf tells three situations apart", () => {
  it("names an actor who carries both an id and an auth collection", () => {
    expect(identityOf({ user: { id: "anna", collection: "editors" } }, TWO)).toMatchObject({
      kind: "named",
    });
  });

  it("answers `nobody` when the request carried no user", () => {
    expect(identityOf({ user: null }, ONE)).toMatchObject({ kind: "nobody" });
  });

  it("answers `unnameable` for a user object with no id, and says so", () => {
    const logger = { warn: vi.fn() };

    expect(identityOf({ user: { collection: "editors" } }, TWO, logger)).toMatchObject({
      kind: "unnameable",
    });
    expect(logger.warn, "a 403 with no explanation is not an answer").toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringContaining("`id`") })
    );
  });

  it("answers `unnameable` when the collection cannot be guessed", () => {
    expect(identityOf({ user: { id: "anna" } }, TWO)).toMatchObject({ kind: "unnameable" });
  });

  it("still names an actor when one auth collection makes the guess safe", () => {
    expect(identityOf({ user: { id: "anna" } }, ONE)).toMatchObject({ kind: "named" });
  });

  it("says what is wrong and how to fix it, without promising the work proceeds", () => {
    const logger = { warn: vi.fn() };

    identityOf({ user: { id: "anna" } }, TWO, logger);

    const [{ msg }] = logger.warn.mock.calls[0] as [{ msg: string }];
    expect(msg).toContain("collection");
    expect(msg, "the old text promised an unchecked write; that is no longer true").not.toContain(
      "without a permission check"
    );
  });
});
