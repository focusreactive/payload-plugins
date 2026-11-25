import { afterEach, describe, expect, it, vi } from "vitest";

import { REQUEST_TIMEOUT_MS, createRequest } from "../createRequest.js";
import { ApiRequestError } from "../errors/ApiRequestError.js";

type Fetch = typeof globalThis.fetch;

const answering =
  (response: () => Response): Fetch =>
  async () =>
    response();

/** Never answers; rejects with the abort reason when the signal fires, as a browser fetch does. */
const hanging: Fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

const failureOf = async (fetch: Fetch, path = "/x"): Promise<unknown> =>
  createRequest({ baseURL: "/api/translate", fetch })(path)
    .then(() => null)
    .catch((error: unknown) => error);

const json = (status: number, body: unknown) => () => Response.json(body, { status });

describe("createRequest", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends to the relative base with the session cookie, as Payload's admin does", async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json({ data: 1 }));

    await createRequest({ baseURL: "/api/translate", fetch })("/enqueue", { method: "post" });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("/api/translate/enqueue");
    expect(init).toMatchObject({ credentials: "include", method: "POST" });
  });

  it("maps a fetch that never reached the server to network, without a retry", async () => {
    const fetch = vi.fn<Fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });

    const failure = await failureOf(fetch);

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({ reason: "network" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps a request still unanswered after the timeout to timeout", async () => {
    vi.useFakeTimers();
    const pending = failureOf(hanging);

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    expect(await pending).toMatchObject({ reason: "timeout" });
  });

  it.each([
    [401, "forbidden"],
    [403, "forbidden"],
    [404, "not-found"],
    [429, "busy"],
    [500, "server"],
    [503, "server"],
    [405, "rejected"],
  ])("maps %i to %s, keeping the status and the server's message", async (status, reason) => {
    const failure = await failureOf(answering(json(status, { message: "said the server" })));

    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure).toMatchObject({ reason, status, message: "said the server" });
  });

  it("maps a 400 to rejected with the fields it got wrong", async () => {
    const details = [{ code: "invalid_type", path: ["source_lng"], message: "Required" }];

    const failure = await failureOf(answering(json(400, { message: "Validation error", details })));

    expect(failure).toMatchObject({ reason: "rejected", status: 400, details });
  });

  it("maps an error status with a non-JSON body by its status", async () => {
    const failure = await failureOf(
      answering(() => new Response("<h1>Bad gateway</h1>", { status: 502 }))
    );

    expect(failure).toMatchObject({ reason: "server", status: 502 });
  });

  it("maps a successful answer that is not JSON to server", async () => {
    const failure = await failureOf(
      answering(
        () =>
          new Response("<html>Sign in</html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          })
      )
    );

    expect(failure).toMatchObject({ reason: "server", status: 200 });
  });

  it("resolves a 204 with nothing", async () => {
    const answer = await createRequest({
      baseURL: "/api/translate",
      fetch: answering(() => new Response(null, { status: 204 })),
    })("/cancel", { method: "delete" });

    expect(answer).toBeUndefined();
  });
});
