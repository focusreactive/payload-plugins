import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload } from "payload";
import { APIError } from "payload";

import { readFailureReason } from "../../../core/domain/translation-providers/failureReason";

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

const { checkTranslationPermission } = await import("./translationPermission");

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

  it("treats a field whose `update` is absent as refused", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { title: { create: true, read: true }, body: true },
    });

    const result = await ask({ title: "t", body: "b" });

    expect(result.deniedFields).toEqual(["title"]);
  });

  it("treats the bare `true` as allowed", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: { title: true } });

    expect((await ask({ title: "t" })).deniedFields).toEqual([]);
  });

  it("finds a refusal nested inside a container, and names the leaf", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { meta: { update: true, fields: { subtitle: { read: true }, headline: true } } },
    });

    const result = await ask({ meta: { subtitle: "s", headline: "h" } });

    expect(result.deniedFields).toEqual(["meta.subtitle"]);
  });

  it("names an array's refused leaf once, without a row index", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { items: { update: true, fields: { code: { read: true }, label: true } } },
    });

    const result = await ask({
      items: [
        { code: "a", label: "one" },
        { code: "b", label: "two" },
      ],
    });

    expect(result.deniedFields).toEqual(["items.code"]);
  });

  it("allows a container whose children all allow the write", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { meta: { update: true, fields: { subtitle: true } } },
    });

    expect((await ask({ meta: { subtitle: "s" } })).deniedFields).toEqual([]);
  });

  it.each([
    ["every operation refused", {}],
    ["every operation refused, versioned", { readVersions: true }],
    ["update refused, one field granting it", { fields: { title: true } }],
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

  it("denies nothing when `fields` collapsed to `true`", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    expect((await ask({ title: "t", meta: { subtitle: "s" } })).deniedFields).toEqual([]);
  });

  it("treats a field the sanitizer removed entirely as refused", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: { body: true } });

    expect((await ask({ title: "t", body: "b" })).deniedFields).toEqual(["title"]);
  });

  it("never refuses a row's identity or its block type", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { items: { update: true, fields: { label: true } } },
    });

    const result = await ask({ id: "d1", items: [{ id: "r1", blockType: "hero", label: "one" }] });

    expect(result.deniedFields).toEqual([]);
  });

  it("honours a rule on a real field that happens to be named like row structure", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { blockName: { create: true, read: true }, title: true },
    });

    const result = await ask({ blockName: "Named", title: "t" });

    expect(result.deniedFields).toEqual(["blockName"]);
  });

  it("finds a refusal declared inside a block", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: {
        content: {
          update: true,
          blocks: { hero: { fields: { headline: { read: true }, sub: true } } },
        },
      },
    });

    const result = await ask({ content: [{ blockType: "hero", headline: "h", sub: "s" }] });

    expect(result.deniedFields).toEqual(["content.headline"]);
  });

  it("refuses every field of a block the rules removed", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { content: { update: true, blocks: { quote: true } } },
    });

    const result = await ask({ content: [{ blockType: "hero", headline: "h" }] });

    expect(result.deniedFields).toEqual(["content.headline"]);
  });

  it("does not walk into the value of a granted leaf", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: { body: { update: true } } });

    const result = await ask({ body: { root: { children: [] } } });

    expect(result.deniedFields).toEqual([]);
  });

  it("rebuilds the requester at the depth Payload authenticates at", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    await ask({ title: "t" });

    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "users", depth: 3 })
    );
  });

  it("asks nothing and allows everything when the request named nobody", async () => {
    const result = await ask({ title: "t" }, {} as never);

    expect(result).toEqual({ allowed: true, deniedFields: [], user: null });
    expect(await evaluator()).not.toHaveBeenCalled();
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
