import { describe, expect, it, vi } from "vitest";
import type { CollectionConfig, Endpoint, PayloadRequest } from "payload";

import { translationStub } from "../../../../composition/modules/translationStub.js";
import { TranslatorConfigError } from "../../../../core/errors/TranslatorConfigError.js";
import { resolveSettings } from "../../../../settings.js";
import { AnyAccessGuard } from "../../../shared/access/AnyAccessGuard.js";
import { storeDouble } from "../../runs/__tests__/fixtures/runRecordStore.js";
import { translationLanguages } from "../../../features/_lib/index.js";
import { ENDPOINTS } from "../../../../types/wire/endpoints.js";
import type { EndpointName } from "../../../../types/wire/endpoints.js";
import type { TranslationModule } from "../../plugin-config/index.js";

const posts = { slug: "posts", fields: [] } as unknown as CollectionConfig;

/** The module's contributions, collected the way the plugin's builder receives them. */
const routesOf = (module: TranslationModule): Endpoint[] => {
  const endpoints: Endpoint[] = [];
  module.setup?.({
    collections: [posts],
    settings: resolveSettings({}),
    access: new AnyAccessGuard(),
    taskRunnerFactory: { create: vi.fn(), capabilities: { stop: true, run: true } },
    runRecordStoreFactory: () => storeDouble(),
    schemaMap: new Map(),
    translationProvider: { translate: vi.fn() },
    walk: translationLanguages(),
    addEndpoints: (added) => endpoints.push(...added),
    addConfigModifier: () => undefined,
  });
  return endpoints;
};

type Ask = {
  params?: Record<string, string>;
  body?: unknown;
  search?: string;
  findByID?: ReturnType<typeof vi.fn>;
};

const request = ({ params = {}, body, search = "", findByID = vi.fn() }: Ask): PayloadRequest =>
  ({
    routeParams: params,
    json: async () => body,
    searchParams: new URLSearchParams(search),
    headers: new Headers(),
    user: { id: 1 },
    payload: {
      config: { localization: { defaultLocale: "en", locales: ["en", "de", "fr"] } },
      findByID,
    },
  }) as unknown as PayloadRequest;

const stubbed = (scenario = "empty") => {
  const routes = routesOf(translationStub({ scenario }));
  return async (name: EndpointName, ask: Ask = {}) => {
    const { method, path } = ENDPOINTS[name];
    const route = routes.find((r) => r.method === method && r.path === `/translate${path}`);
    if (!route) throw new Error(`the stub does not serve ${name}`);
    const response = await route.handler(request(ask));
    const text = await response.text();
    return { status: response.status, body: text === "" ? null : JSON.parse(text) };
  };
};

const POST_1 = { collection_slug: "posts", collection_id: "1" };
const enqueueOf = (ids: string[], target: string | string[] = ["de", "fr"]) => ({
  body: { source_lng: "en", target_lng: target, collection_slug: "posts", collection_id: ids },
});

describe("the stub's reads", () => {
  it("answers a document's state for every host locale but the source", async () => {
    const call = stubbed();

    const { status, body } = await call("documentState", { params: POST_1 });

    expect(status).toBe(200);
    expect(body.data).toMatchObject({ collection: "posts", id: "1", sourceLocale: "en" });
    expect(body.data.locales.map((l: { locale: string }) => l.locale)).toEqual(["de", "fr"]);
  });

  it("answers a page of documents in one list read", async () => {
    const call = stubbed();

    const { status, body } = await call("listState", {
      params: { collection_slug: "posts" },
      search: "ids=1,2",
      findByID: vi.fn().mockResolvedValue({ title: "Hello" }),
    });

    expect(status).toBe(200);
    expect(body.data.docs.map((d: { id: string }) => d.id)).toEqual(["1", "2"]);
    expect(body.data.docs[0].locales[0]).toEqual({
      locale: "de",
      content: { kind: "empty" },
      run: null,
    });
  });

  it("leaves out an id the host does not hold", async () => {
    const held = vi.fn(async ({ id }: { id: string }) => (id === "2" ? null : { title: "Hello" }));

    const { body } = await stubbed()("listState", {
      params: { collection_slug: "posts" },
      search: "ids=1,2,3",
      findByID: held,
    });

    expect(body.data.docs.map((d: { id: string }) => d.id)).toEqual(["1", "3"]);
  });

  it("refuses a collection the plugin does not manage", async () => {
    const { status } = await stubbed()("documentState", {
      params: { collection_slug: "users", collection_id: "1" },
    });

    expect(status).toBe(400);
  });
});

describe("the stub's actions answer as the real routes do", () => {
  it("enqueue answers the queued count and one handle for the run", async () => {
    const { status, body } = await stubbed()("enqueue", enqueueOf(["1"]));

    expect(status).toBe(200);
    expect(body.data).toMatchObject({ success: true, queued: 2 });
    expect(body.data.busy).toBeUndefined();
    expect(body.data.assignments).toHaveLength(2);
  });

  it("enqueue for a document with a live run answers it as busy and queues nothing", async () => {
    const call = stubbed();
    await call("enqueue", enqueueOf(["1"], "de"));

    const { status, body } = await call("enqueue", enqueueOf(["1"], "fr"));

    expect(status).toBe(200);
    expect(body.data).toMatchObject({ success: true, queued: 0, busy: ["1"] });
  });

  it("enqueue refuses a malformed body and a request with no target left", async () => {
    const call = stubbed();

    expect((await call("enqueue", { body: { source_lng: "en" } })).status).toBe(400);
    expect((await call("enqueue", enqueueOf(["1"], ["en", "xx"]))).status).toBe(400);
  });

  it("a read after enqueue shows the run, which then runs and finishes", async () => {
    const call = stubbed();
    await call("enqueue", enqueueOf(["1"], "de"));

    const statusOf = async () =>
      (await call("documentState", { params: POST_1 })).body.data.locales[0].run?.status ?? null;

    expect(await statusOf()).toBe("queued");
    expect(await statusOf()).toBe("running");
    expect(await statusOf()).toBeNull();
  });

  it("cancel answers 204 and the whole run is gone", async () => {
    const call = stubbed();
    await call("enqueue", enqueueOf(["1"]));

    const { status } = await call("cancel", {
      body: { collection_slug: "posts", collection_id: ["1"] },
    });

    expect(status).toBe(204);
    const { locales } = (await call("documentState", { params: POST_1 })).body.data;
    expect(locales.map((l: { run: unknown }) => l.run)).toEqual([null, null]);
  });

  it("cancel for the whole collection answers 204", async () => {
    const { status } = await stubbed()("cancel", {
      body: { collection_slug: "posts", select_all: true },
    });

    expect(status).toBe(204);
  });

  it("run answers 204 for a queued run and 404 for a document with no run", async () => {
    const call = stubbed();
    await call("enqueue", enqueueOf(["1"]));

    expect((await call("runNow", { params: POST_1 })).status).toBe(204);
    expect(
      (await call("runNow", { params: { collection_slug: "posts", collection_id: "nobody" } }))
        .status
    ).toBe(404);
  });

  it("dismiss answers 200 with success, like the real route", async () => {
    const { status, body } = await stubbed("mixed")("dismissStaleness", {
      body: { ...POST_1, target_lng: "de" },
    });

    expect(status).toBe(200);
    expect(body).toEqual({ data: { success: true } });
  });
});

describe("the stub's field translation", () => {
  const saved = vi.fn().mockResolvedValue({ title: "Hello", meta: { views: 3 } });
  const field = (field_path: string) => ({
    body: { collection_slug: "posts", field_path, target_lng: "de", source_lng: "en", doc_id: "1" },
    findByID: saved,
  });

  it("marks a saved string with the target locale", async () => {
    const { status, body } = await stubbed()("translateField", field("title"));

    expect(status).toBe(200);
    expect(body.data).toEqual({ status: "translated", value: "[de] Hello" });
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en", draft: true, fallbackLocale: false, id: "1" })
    );
  });

  it("answers anything else as a noop with an info notice", async () => {
    const { body } = await stubbed()("translateField", field("meta.views"));

    expect(body.data).toMatchObject({ status: "noop", notice: { level: "info" } });
  });
});

describe("choosing a scenario", () => {
  it("refuses a scenario nobody wrote, naming the ones there are", () => {
    expect(() => translationStub({ scenario: "chaos" })).toThrow(TranslatorConfigError);
    expect(() => translationStub({ scenario: "chaos" })).toThrow(/mixed/u);
  });

  it("leaves out cancel, cancel by collection and run when abilities are limited", () => {
    const paths = routesOf(translationStub({ scenario: "abilities-limited" })).map((r) => r.path);

    expect(paths).not.toContain("/translate/cancel");
    expect(paths).not.toContain("/translate/cancel-by-collection/:collection_slug");
    expect(paths).not.toContain("/translate/run/:id");
    expect(paths).toContain("/translate/enqueue");
  });
});
