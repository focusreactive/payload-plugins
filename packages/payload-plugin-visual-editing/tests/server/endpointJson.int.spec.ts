import type { PayloadRequest } from "payload";

import { describe, expect, it } from "vitest";

import { jsonBodyOf } from "../../src/server/endpointJson";

const BODY = { key: "title", value: "New" };

const requestOf = (headers: Record<string, string>): PayloadRequest =>
  ({ headers: new Headers(headers), text: async () => JSON.stringify(BODY) }) as PayloadRequest;

describe("the JSON body of a request to an endpoint the session cookie opens", () => {
  it.each([
    ["application/json"],
    ["application/json; charset=utf-8"],
    ["Application/JSON;charset=UTF-8"],
  ])("is read when it is sent as %s", async (contentType) => {
    expect(await jsonBodyOf(requestOf({ "Content-Type": contentType }))).toEqual(BODY);
  });

  it.each([
    ["text/plain", { "Content-Type": "text/plain" }],
    ["text/plain with a charset", { "Content-Type": "text/plain; charset=utf-8" }],
    ["a form", { "Content-Type": "application/x-www-form-urlencoded" }],
    ["multipart data", { "Content-Type": "multipart/form-data; boundary=x" }],
    ["another JSON type", { "Content-Type": "application/json-patch+json" }],
    ["no type", {}],
  ])("is not read when it is sent as %s", async (_name, headers) => {
    expect(await jsonBodyOf(requestOf(headers))).toBeNull();
  });

  it("is not read when the connection breaks off while it is read", async () => {
    const request = {
      headers: new Headers({ "Content-Type": "application/json" }),
      text: async (): Promise<string> => {
        throw new TypeError("terminated");
      },
    } as PayloadRequest;
    expect(await jsonBodyOf(request)).toBeNull();
  });
});
