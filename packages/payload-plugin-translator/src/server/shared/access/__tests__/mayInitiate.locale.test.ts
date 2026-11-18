import { describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";

/*
 * Rights in Payload have no language. But `mayInitiate` asks with empty `data`, which makes Payload
 * load the document to answer, and a loaded document has to come back in some locale — so a rule
 * reading the document would answer per locale. The locale is therefore `mayInitiate`'s to pick,
 * and these pin which one, for every caller.
 */

vi.mock("payload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("payload")>()),
  createLocalReq: vi.fn(),
}));

const { mayInitiate } = await import("../permission.js");
const builder = async () =>
  (await import("payload")).createLocalReq as unknown as ReturnType<typeof vi.fn>;

const ANNA = { collection: "users", id: "anna" };

const askAbout = async (localization: unknown): Promise<string | undefined> => {
  const payload = {
    config: { localization },
    collections: {
      posts: { config: { slug: "posts", access: { update: () => true }, fields: [] } },
    },
    findByID: vi.fn().mockResolvedValue({ id: "d1" }),
    logger: { error: () => {} },
  } as unknown as Payload;

  const createLocalReq = await builder();
  createLocalReq.mockClear();
  createLocalReq.mockImplementation(async () => ({
    headers: new Headers(),
    i18n: { t: () => "" },
    t: () => "",
    context: {},
    payload,
  }));

  await mayInitiate({ payload, collection: "posts" as never, id: "d1", user: ANNA });

  return (createLocalReq.mock.calls[0]?.[0] as { locale?: string } | undefined)?.locale;
};

describe("the locale mayInitiate asks in", () => {
  it("is the project's default, not the locale any caller is working on", async () => {
    expect(await askAbout({ defaultLocale: "en", locales: ["en", "de"] })).toBe("en");
  });

  it("is empty when the project has no localization to name one", async () => {
    expect(await askAbout(undefined)).toBe("");
  });
});
