import { describe, expect, it } from "vitest";
import { deriveMissing } from "../../../src/utils/ga4/deriveMissing";

describe("deriveMissing", () => {
  it("returns the matched key when the message names a single customEvent dim", () => {
    expect(
      deriveMissing(
        { message: "3 INVALID_ARGUMENT: Field customEvent:fr_session_id is unrecognized." },
        ["fr_session_id", "fr_event_seq"]
      )
    ).toEqual(["fr_session_id"]);
  });

  it("returns the matched key when the message names an averageCustomEvent metric", () => {
    expect(
      deriveMissing(
        { message: "3 INVALID_ARGUMENT: Field averageCustomEvent:fr_elapsed_ms is unrecognized." },
        ["fr_elapsed_ms"]
      )
    ).toEqual(["fr_elapsed_ms"]);
  });

  it("falls back to the full candidates list when no key matches", () => {
    expect(
      deriveMissing({ message: "3 INVALID_ARGUMENT: vague error" }, [
        "fr_session_id",
        "fr_event_seq",
      ])
    ).toEqual(["fr_session_id", "fr_event_seq"]);
  });

  it("filters candidates: matched key not in candidates → fallback", () => {
    expect(
      deriveMissing(
        { message: "3 INVALID_ARGUMENT: Field customEvent:fr_session_id is unrecognized." },
        ["fr_event_seq"]
      )
    ).toEqual(["fr_event_seq"]);
  });

  it("returns fr_session_start when the message names customEvent:fr_session_start", () => {
    expect(
      deriveMissing(
        { message: "3 INVALID_ARGUMENT: Field customEvent:fr_session_start is unrecognized." },
        ["fr_session_id", "fr_session_start"]
      )
    ).toEqual(["fr_session_start"]);
  });

  it("derives fr_lead_type from customEvent:fr_lead_type message", () => {
    const result = deriveMissing(
      { message: "3 INVALID_ARGUMENT: Field customEvent:fr_lead_type is unrecognized." },
      ["fr_lead_type"]
    );
    expect(result).toEqual(["fr_lead_type"]);
  });
});
