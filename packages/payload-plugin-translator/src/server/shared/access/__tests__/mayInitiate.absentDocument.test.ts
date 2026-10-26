import { describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";

// `createLocalReq` is the only stub: a real one wants a whole sanitized config. Payload's evaluator runs for real.
vi.mock("payload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("payload")>()),
  createLocalReq: vi.fn(),
}));

const { NotFound } = await import("payload");
const { mayInitiate } = await import("../permission.js");

const requestBuilder = async () =>
  (await import("payload")).createLocalReq as unknown as ReturnType<typeof vi.fn>;

const ANNA = { collection: "users", id: "anna" };

async function askAbout(findByID: ReturnType<typeof vi.fn>): Promise<boolean> {
  const payload = {
    collections: {
      posts: { config: { slug: "posts", access: { update: () => true }, fields: [] } },
    },
    findByID,
    logger: { error: () => {} },
  } as unknown as Payload;

  (await requestBuilder()).mockImplementation(async () => ({
    headers: new Headers(),
    i18n: { t: () => "" },
    t: () => "",
    context: {},
    payload,
  }));

  return await mayInitiate({
    payload,
    collection: "posts" as never,
    id: "d1",
    user: ANNA,
  });
}

describe("mayInitiate — a document that is not there", () => {
  it("raises no objection rather than failing the ask", async () => {
    const absent = vi.fn().mockRejectedValue(new NotFound());

    await expect(askAbout(absent)).resolves.toBe(true);
  });

  it("still answers for a document that is there", async () => {
    const present = vi.fn().mockResolvedValue({ id: "d1" });

    await expect(askAbout(present)).resolves.toBe(true);
  });

  it("lets every other failure out", async () => {
    const broken = vi.fn().mockRejectedValue(new Error("the database is down"));

    await expect(askAbout(broken)).rejects.toThrow("the database is down");
  });
});
