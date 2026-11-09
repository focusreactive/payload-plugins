import { describe, expect, it } from "vitest";
import { MAX_IP_LENGTH, MAX_USER_AGENT_LENGTH } from "../../src/constants";
import { clientInfoOf } from "../../src/core/clientInfo";

describe("clientInfoOf", () => {
  it("takes the first x-forwarded-for entry and the user-agent", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
      "x-real-ip": "10.0.0.9",
      "user-agent": "Mozilla/5.0",
    });
    expect(clientInfoOf(headers)).toEqual({ ip: "203.0.113.7", userAgent: "Mozilla/5.0" });
  });

  it("falls back to x-real-ip when x-forwarded-for is missing or empty", () => {
    expect(clientInfoOf(new Headers({ "x-real-ip": "198.51.100.4" })).ip).toBe("198.51.100.4");
    expect(
      clientInfoOf(new Headers({ "x-forwarded-for": " , ", "x-real-ip": "198.51.100.4" })).ip
    ).toBe("198.51.100.4");
  });

  it("is null for what the request does not send, and for a request without headers", () => {
    expect(clientInfoOf(new Headers())).toEqual({ ip: null, userAgent: null });
    expect(clientInfoOf(undefined)).toEqual({ ip: null, userAgent: null });
  });

  it("caps the stored lengths", () => {
    const headers = new Headers({
      "x-forwarded-for": "a".repeat(500),
      "user-agent": "b".repeat(5000),
    });
    const { ip, userAgent } = clientInfoOf(headers);
    expect(ip).toHaveLength(MAX_IP_LENGTH);
    expect(userAgent).toHaveLength(MAX_USER_AGENT_LENGTH);
  });
});
