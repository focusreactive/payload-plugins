import { describe, expect, it } from "vitest";

import {
  KeySetMismatchError,
  NoContentError,
  ProviderConfigurationError,
  TransportError,
  TranslationProviderError,
  UnparseableReplyError,
  wrapTransportError,
} from ".";

describe("the failure taxonomy", () => {
  it("gives every leaf its own code", () => {
    expect(new NoContentError("x").code).toBe("no-content");
    expect(new UnparseableReplyError("x").code).toBe("unparseable-reply");
    expect(new KeySetMismatchError("x", [], []).code).toBe("key-set-mismatch");
    expect(new TransportError("x").code).toBe("transport");
    expect(new ProviderConfigurationError("x").code).toBe("config");
  });

  it("makes every leaf catchable as the base class", () => {
    expect(new NoContentError("x")).toBeInstanceOf(TranslationProviderError);
    expect(new TransportError("x")).toBeInstanceOf(Error);
  });

  it("names each error after its own class, so a log line identifies the cause", () => {
    expect(new NoContentError("x").name).toBe("NoContentError");
  });

  it("keeps the original on cause", () => {
    const original = new Error("boom");

    expect(new TransportError("x", { cause: original }).cause).toBe(original);
  });
});

describe("wrapTransportError", () => {
  it("never quotes the original error's text in its own message", () => {
    const secretive = new Error("401 Unauthorized — key sk-test-abcdef123456");

    const wrapped = wrapTransportError(secretive);

    expect(wrapped.message).not.toContain("sk-test-abcdef123456");
    expect(wrapped.message).not.toContain("401 Unauthorized");
  });

  it("keeps the original reachable on cause", () => {
    const original = new Error("connection refused");

    expect(wrapTransportError(original).cause).toBe(original);
  });

  it("wraps a non-Error throw too", () => {
    const wrapped = wrapTransportError("just a string");

    expect(wrapped).toBeInstanceOf(TransportError);
    expect(wrapped.cause).toBe("just a string");
  });

  it("passes one of our own errors through unchanged", () => {
    const ours = new KeySetMismatchError("nothing matched", [0], []);

    expect(wrapTransportError(ours)).toBe(ours);
  });
});

describe("the cause cannot be serialized into a response body", () => {
  it("keeps the cause out of JSON.stringify", () => {
    const vendorError = Object.assign(new Error("401 Unauthorized"), {
      status: 401,
      headers: { authorization: "Bearer sk-proj-SECRET" },
    });

    const serialized = JSON.stringify(
      new TransportError("Request failed.", { cause: vendorError })
    );

    expect(serialized).not.toContain("sk-proj-SECRET");
    expect(serialized).not.toContain("authorization");
  });

  it("still exposes the cause to code that asks for it", () => {
    const vendorError = new Error("401 Unauthorized");

    expect(new TransportError("x", { cause: vendorError }).cause).toBe(vendorError);
  });

  it("installs cause as a non-enumerable property", () => {
    const wrapped = new TransportError("x", { cause: new Error("boom") });

    expect(Object.propertyIsEnumerable.call(wrapped, "cause")).toBe(false);
  });
});
