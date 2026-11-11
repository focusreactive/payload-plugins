import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  buildPlanDigest,
  confirmationTokenLifetimeSeconds,
  issueConfirmationToken,
  verifyConfirmationToken,
} from "../../src/mcp/confirmationToken.js";

const secret = "a-long-enough-test-secret";
const user = { collection: "users", id: 7 };
const now = 1_800_000_000_000;
const request = { items: [{ collection: "pages", id: 9 }], redirects: true, toFolder: 8 };

const issue = (overrides: Partial<Parameters<typeof issueConfirmationToken>[0]> = {}) =>
  issueConfirmationToken({
    digest: "digest-one",
    kind: "move",
    now,
    request,
    secret,
    user,
    ...overrides,
  });

const reforge = (token: string, change: (body: Record<string, unknown>) => void): string => {
  const [bodyPart] = token.split(".");
  const body = JSON.parse(Buffer.from(bodyPart, "base64url").toString("utf-8")) as Record<
    string,
    unknown
  >;
  change(body);

  return `${Buffer.from(JSON.stringify(body)).toString("base64url")}.${token.split(".")[1]}`;
};

/** A token signed with the same key derivation as the plugin, for a body the plugin would never issue. */
const signedWith = (body: Record<string, unknown>): string => {
  const key = createHmac("sha256", secret).update("folders-mcp-confirmation-token").digest();
  const bodyPart = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = createHmac("sha256", key).update(bodyPart).digest("base64url");

  return `${bodyPart}.${signature}`;
};

describe("a confirmation token round trip", () => {
  it("gives back the request, the user, the digest and the kind it was issued with", () => {
    const result = verifyConfirmationToken({ now, secret, token: issue(), user });

    expect(result).toEqual({
      body: {
        digest: "digest-one",
        expiresAt: now + confirmationTokenLifetimeSeconds * 1000,
        kind: "move",
        request,
        user,
        version: 1,
      },
      ok: true,
    });
  });

  it("lives for 15 minutes and is valid up to the last second", () => {
    expect(confirmationTokenLifetimeSeconds).toBe(900);
    const token = issue();

    expect(verifyConfirmationToken({ now: now + 899_000, secret, token, user }).ok).toBe(true);
  });

  it("compares the user by collection and id, however the id is written", () => {
    const token = issue({ user: { collection: "users", id: "7" } });

    expect(verifyConfirmationToken({ now, secret, token, user }).ok).toBe(true);
  });
});

describe("a confirmation token refusal", () => {
  const refusalOf = (result: ReturnType<typeof verifyConfirmationToken>): string => {
    expect(result.ok).toBe(false);

    return result.ok ? "" : result.message;
  };

  it("refuses a body changed after signing", () => {
    const forged = reforge(issue(), (body) => {
      (body.request as { toFolder: number }).toFolder = 99;
    });

    expect(refusalOf(verifyConfirmationToken({ now, secret, token: forged, user }))).toContain(
      "Preview again"
    );
  });

  it("refuses a token signed with another secret", () => {
    const token = issue({ secret: "another-secret-entirely" });

    expect(refusalOf(verifyConfirmationToken({ now, secret, token, user }))).toContain(
      "Preview again"
    );
  });

  it("refuses text that is not a token", () => {
    for (const token of ["", "garbage", "a.b.c", ".", "!!!.???"]) {
      expect(refusalOf(verifyConfirmationToken({ now, secret, token, user }))).toContain(
        "Preview again"
      );
    }
  });

  it("refuses a token another user previewed", () => {
    const token = issue();
    const message = refusalOf(
      verifyConfirmationToken({ now, secret, token, user: { collection: "users", id: 8 } })
    );

    expect(message).toContain("another user");
    expect(message).toContain("Preview again");
  });

  it("refuses a user of another collection with the same id", () => {
    const token = issue();

    expect(
      verifyConfirmationToken({ now, secret, token, user: { collection: "editors", id: 7 } }).ok
    ).toBe(false);
  });

  it("refuses an expired token", () => {
    const token = issue();
    const message = refusalOf(verifyConfirmationToken({ now: now + 900_000, secret, token, user }));

    expect(message).toContain("expired");
    expect(message).toContain("Preview again");
  });

  it("refuses an unknown version", () => {
    const token = signedWith({
      digest: "d",
      expiresAt: now + 1000,
      kind: "move",
      request,
      user,
      version: 2,
    });

    expect(refusalOf(verifyConfirmationToken({ now, secret, token, user }))).toContain(
      "Preview again"
    );
  });

  it("refuses an unknown kind", () => {
    const token = signedWith({
      digest: "d",
      expiresAt: now + 1000,
      kind: "delete",
      request,
      user,
      version: 1,
    });

    expect(refusalOf(verifyConfirmationToken({ now, secret, token, user }))).toContain(
      "Preview again"
    );
  });
});

describe("the plan digest", () => {
  const changes = [
    { from: "/b", locale: "en", to: "/x/b" },
    { from: "/a", locale: "de", to: "/x/a" },
    { from: "/a", locale: "en", to: "/x/a" },
  ];

  it("does not depend on the order of the changes or of the counts", () => {
    const first = buildPlanDigest({ changes, counts: { en: 2, total: 3 } });
    const second = buildPlanDigest({
      changes: [...changes].reverse(),
      counts: { total: 3, en: 2 },
    });

    expect(second).toBe(first);
  });

  it("changes with one URL, one locale or one count", () => {
    const base = buildPlanDigest({ changes, counts: { total: 3 } });

    expect(buildPlanDigest({ changes: changes.slice(1), counts: { total: 3 } })).not.toBe(base);
    expect(
      buildPlanDigest({
        changes: [{ ...changes[0], to: "/y/b" }, ...changes.slice(1)],
        counts: { total: 3 },
      })
    ).not.toBe(base);
    expect(
      buildPlanDigest({
        changes: [{ ...changes[0], locale: "de" }, ...changes.slice(1)],
        counts: { total: 3 },
      })
    ).not.toBe(base);
    expect(buildPlanDigest({ changes, counts: { total: 4 } })).not.toBe(base);
  });

  it("does not let a change slide across its fields to match another", () => {
    const left = buildPlanDigest({ changes: [{ from: "/a", locale: "en", to: "/b" }], counts: {} });
    const right = buildPlanDigest({
      changes: [{ from: "/a/", locale: "en", to: "b" }],
      counts: {},
    });

    expect(left).not.toBe(right);
  });
});
