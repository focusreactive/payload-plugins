import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload } from "payload";
import { APIError } from "payload";

import { readFailureReason } from "../../../core/domain/translation-providers/failureReason.js";

vi.mock("payload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("payload")>()),
  docAccessOperation: vi.fn(),
  createLocalReq: vi.fn(),
}));

const evaluator = async () =>
  (await import("payload")).docAccessOperation as unknown as ReturnType<typeof vi.fn>;

const requestBuilder = async () =>
  (await import("payload")).createLocalReq as unknown as ReturnType<typeof vi.fn>;

const A_REAL_REQUEST = { headers: new Headers(), i18n: {}, t: () => "", context: {} };

const { checkTranslationPermission } = await import("./translationPermission.js");

const ANNA = { userId: "anna", userCollection: "users" };

const payload = {
  collections: {
    posts: { config: { slug: "posts" } },
    users: { config: { slug: "users", auth: { depth: 3 } } },
  },
  findByID: vi.fn().mockResolvedValue({ id: "anna", email: "anna@test" }),
} as unknown as Payload;

const ask = (data: Record<string, unknown>, scope = ANNA) =>
  checkTranslationPermission({
    payload,
    collection: "posts" as never,
    id: "d1",
    data,
    targetLocale: "de",
    scope,
  });

// Every fixture shape below was measured against Payload 3.84.1's sanitizer, not invented.
describe("checkTranslationPermission — reading Payload's permission shape", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (payload.findByID as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anna" });
    (await requestBuilder()).mockImplementation(async (args: { req: object }) => ({
      ...A_REAL_REQUEST,
      ...args.req,
    }));
  });

  it.each([
    ["every operation refused", {}],
    ["every operation refused, versioned", { readVersions: true }],
    ["update refused, though a field still grants it", { fields: { title: true } }],
  ])(
    "refuses the write when the collection does not grant update — %s",
    async (_case, permissions) => {
      (await evaluator()).mockResolvedValue(permissions);

      expect((await ask({ title: "t" })).allowed).toBe(false);
    }
  );

  it("allows the write when the collection grants update", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    expect((await ask({ title: "t" })).allowed).toBe(true);
  });

  it("reads a resolved where-query grant as a grant", async () => {
    (await evaluator()).mockResolvedValue({
      update: { permission: true, where: { tenant: { equals: "t1" } } },
      fields: true,
    });

    expect((await ask({ title: "t" })).allowed).toBe(true);
  });

  it("rebuilds the requester at the depth Payload authenticates at", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    await ask({ title: "t" });

    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "users", depth: 3 })
    );
  });

  it("refuses to guess when the named requester cannot be found", async () => {
    (payload.findByID as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not found"));

    const error = await ask({ title: "t" }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(APIError);
    expect(readFailureReason((error as Error).message)).toBe("requester-missing");
  });

  it("surfaces an access rule that throws, because the caller's save is already gone", async () => {
    (await evaluator()).mockRejectedValue(new TypeError("Cannot read properties of null"));

    const error = await ask({ title: "t" }).catch((e: Error) => e);

    // An APIError is what `killedTheCallersTransaction` recognises further up the chain; a plain
    // error would be swallowed as best-effort and the editor told their save succeeded.
    expect(error).toBeInstanceOf(APIError);
    expect(readFailureReason((error as Error).message)).toBe("permission-check-failed");
  });

  it("carries the caller's transaction to the evaluator", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    await ask({ title: "t" }, { ...ANNA, transactionID: "tx-1" } as never);

    const [args] = (await evaluator()).mock.calls[0] as [{ req: { transactionID?: string } }];
    expect(args.req.transactionID).toBe("tx-1");
  });

  it("asks about the locale being written, not the project default", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    await ask({ title: "t" });

    const [built] = (await requestBuilder()).mock.calls[0] as [{ locale?: string }];
    expect(built.locale).toBe("de");
  });

  it("hands the evaluator a request Payload built, not a stand-in", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    await ask({ title: "t" }, { ...ANNA, transactionID: "tx-1" } as never);

    const [built] = (await requestBuilder()).mock.calls[0] as [
      { user: { id: string }; req: { transactionID?: string } },
    ];
    expect(built.user.id).toBe("anna");
    expect(built.req.transactionID).toBe("tx-1");

    const [args] = (await evaluator()).mock.calls[0] as [{ req: { headers?: Headers } }];
    expect(args.req.headers).toBeInstanceOf(Headers);
  });
});
