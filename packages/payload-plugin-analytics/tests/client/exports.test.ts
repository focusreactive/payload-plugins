import { describe, expect, it } from "vitest";
import * as client from "../../src/client";

describe("client entrypoint exports", () => {
  it("exports TrackPage", () => {
    expect(typeof client.TrackPage).toBe("function");
  });
});
