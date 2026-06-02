import { describe, expect, it, vi, afterEach } from "vitest";
import { analyticsFetch, AnalyticsHttpError } from "../../../../../src/components/AnalyticsView/hooks/queries/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return Response.json(body, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("analyticsFetch", () => {
  it("POSTs JSON to /api<path> with credentials and content-type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const data = await analyticsFetch<{ a: number }, { ok: number }>("/analytics/kpis", { a: 1 });
    expect(data).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analytics/kpis");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ a: 1 });
  });

  it("forwards AbortSignal to fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    const ctl = new AbortController();
    await analyticsFetch("/analytics/kpis", {}, { signal: ctl.signal });
    expect(fetchMock.mock.calls[0][1].signal).toBe(ctl.signal);
  });

  it("throws AnalyticsHttpError with body.error on 4xx JSON responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Forbidden" }, { status: 403, statusText: "Forbidden" })));
    await expect(analyticsFetch("/analytics/kpis", {})).rejects.toMatchObject({
      name: "AnalyticsHttpError",
      status: 403,
      message: "Forbidden",
    });
  });

  it("throws AnalyticsHttpError with statusText on 5xx non-JSON responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500, statusText: "Internal Server Error" })));
    await expect(analyticsFetch("/analytics/kpis", {})).rejects.toMatchObject({
      name: "AnalyticsHttpError",
      status: 500,
      message: "Internal Server Error",
    });
  });

  it("AnalyticsHttpError instanceof Error and has correct name", () => {
    const e = new AnalyticsHttpError(429, "Too many");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("AnalyticsHttpError");
    expect(e.status).toBe(429);
  });
});
