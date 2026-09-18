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

/** What `createLocalReq` returns: the things a host access rule is entitled to read off a request. */
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
    locale: "de",
    scope,
  });

// Payload's sanitized permissions express a refusal by LEAVING THE KEY OUT, and collapse a field that
// allows everything to the literal `true`. Reading that shape as `update === false` — the obvious
// reading — detects nothing at all, on any adapter. Measured against the real evaluator before these
// were written.
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

  // The leaf, not the branch: a rule on one field inside a group must not cost its siblings their
  // translation.
  it("finds a refusal nested inside a container, and names the leaf", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { meta: { update: true, fields: { subtitle: { read: true }, headline: true } } },
    });

    const result = await ask({ meta: { subtitle: "s", headline: "h" } });

    expect(result.deniedFields).toEqual(["meta.subtitle"]);
  });

  // An array's rows share one set of rules, so a refusal inside any row refuses that leaf everywhere
  // and the path carries no index.
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

  // The collection level is encoded exactly like the field level, and reading it as `update !== false`
  // answers "allowed" to every one of these — the sanitizer never emits `false`, it deletes the key.
  // A collection refusing every operation therefore arrives as `{}`, or as `{ readVersions: true }`
  // when it is versioned, with its fields gone the same way.
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

  // A rule returning a `Where` keeps its object rather than collapsing, because the query carries a
  // condition. `docAccessOperation` has already run it against this document, so `permission` is the
  // answer for this document and nothing further needs deciding.
  it("reads a resolved where-query grant as a grant", async () => {
    (await evaluator()).mockResolvedValue({
      update: { permission: true, where: { tenant: { equals: "t1" } } },
      fields: true,
    });

    expect((await ask({ title: "t" })).allowed).toBe(true);
  });

  // `fields` collapses to the literal `true` when every field allows everything; treating that as a
  // map of permissions would find no permission for any name and refuse the entire document.
  it("denies nothing when `fields` collapsed to `true`", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    expect((await ask({ title: "t", meta: { subtitle: "s" } })).deniedFields).toEqual([]);
  });

  // A field refusing every operation is emptied and then deleted outright, so "absent" is how the
  // strictest rule of all arrives — not how an unmentioned field does.
  it("treats a field the sanitizer removed entirely as refused", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: { body: true } });

    expect((await ask({ title: "t", body: "b" })).deniedFields).toEqual(["title"]);
  });

  // Row identity and the block discriminator are never fields and never translated, and dropping an
  // array row's `id` would make Payload rebuild the row — losing the siblings it shares across
  // locales, which is the whole reason the prune works by path.
  it("never refuses a row's identity or its block type", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { items: { update: true, fields: { label: true } } },
    });

    const result = await ask({ id: "d1", items: [{ id: "r1", blockType: "hero", label: "one" }] });

    expect(result.deniedFields).toEqual([]);
  });

  // None of the three is a reserved name, so a host may declare a translatable field called
  // `blockName` — and then Payload reports a permission for it like any other. Excusing the name
  // rather than its absence would drop that rule on the floor, and only that way round: everywhere
  // else an unclear answer costs a translation, here it would have cost a refusal.
  it("honours a rule on a real field that happens to be named like row structure", async () => {
    (await evaluator()).mockResolvedValue({
      update: true,
      fields: { blockName: { create: true, read: true }, title: true },
    });

    const result = await ask({ blockName: "Named", title: "t" });

    expect(result.deniedFields).toEqual(["blockName"]);
  });

  // Blocks are reported under their own key. Reading only `fields` finds nothing to refuse for a
  // blocks field, which is the shape most documents in this plugin are made of.
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

  // A leaf's value has keys of its own — a rich text document's `root`, a relationship's `value` —
  // and they are not fields. Walking into one would report every one of them as refused and prune the
  // field down to nothing.
  it("does not walk into the value of a granted leaf", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: { body: { update: true } } });

    const result = await ask({ body: { root: { children: [] } } });

    expect(result.deniedFields).toEqual([]);
  });

  // The rules must see the user they would have seen on the editor's own save. Payload authenticates
  // at the collection's `auth.depth`; rebuilt shallower, a rule reading `user.role.name` finds an id
  // where it expects an object and refuses someone who may in fact write.
  it("rebuilds the requester at the depth Payload authenticates at", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    await ask({ title: "t" });

    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "users", depth: 3 })
    );
  });

  // An unattributed request is the host's own server-side code, or a job queued before the requester
  // was recorded. It keeps the behaviour it had, and never reaches the evaluator.
  it("asks nothing and allows everything when the request named nobody", async () => {
    const result = await ask({ title: "t" }, {} as never);

    expect(result).toEqual({ allowed: true, deniedFields: [], user: null });
    expect(await evaluator()).not.toHaveBeenCalled();
  });

  // Two failures, told apart on purpose. Nothing has run yet when the requester cannot be found, so
  // the caller's transaction is intact and this must not read as a destroyed save. By the time the
  // evaluator throws, `killTransaction` has already rolled that transaction back, so it must.
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

  // An access rule returning a `Where` is resolved by counting matching rows, and outside the caller's
  // transaction PostgreSQL cannot count a document the caller has not committed — so the rule would
  // be applied to nothing and answer "allowed". The #124 shape, measured again here.
  it("carries the caller's transaction to the evaluator", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    await ask({ title: "t" }, { ...ANNA, transactionID: "tx-1" } as never);

    const [args] = (await evaluator()).mock.calls[0] as [{ req: { transactionID?: string } }];
    expect(args.req.transactionID).toBe("tx-1");
  });

  // The rules are deciding a write to the *target* locale. Left unset, `createLocalReq` fills in the
  // project's default, so a rule saying "this editor owns English but not German" would be asked
  // about English and its yes used to authorise the German write.
  it("asks about the locale being written, not the project default", async () => {
    (await evaluator()).mockResolvedValue({ update: true, fields: true });

    await ask({ title: "t" });

    const [built] = (await requestBuilder()).mock.calls[0] as [{ locale?: string }];
    expect(built.locale).toBe("de");
  });

  // The host's rules receive this object and may read anything Payload always puts on a request. A
  // hand-rolled `{ payload, user }` makes a correct rule throw, and `docAccessOperation` answers a
  // throw by rolling the caller's transaction back — so a truncated request costs the editor the save
  // their own rule would have allowed.
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
