import { describe, expect, it } from "vitest";
import { pickWinner } from "../../../src/services/abStatistics/pickWinner";

describe("pickWinner", () => {
  const opts = { alpha: 0.05, sessionFloor: 100 };

  it("returns nulls when there are no candidates", () => {
    expect(pickWinner([], opts)).toEqual({ winnerBucket: null, leaderBucket: null });
  });

  it("crowns the highest-confidence variant that clears significance, lift, and the floor", () => {
    const r = pickWinner(
      [
        { bucket: "a", zScore: 2.6, relativeLift: 0.3, minBucketSessions: 2000 },
        { bucket: "b", zScore: 2.1, relativeLift: 0.15, minBucketSessions: 2000 },
      ],
      opts
    );
    expect(r.winnerBucket).toBe("a");
    expect(r.leaderBucket).toBe("a");
  });

  it("declares no winner but still names a provisional leader when nothing is significant", () => {
    const r = pickWinner([{ bucket: "a", zScore: 1.2, relativeLift: 0.1, minBucketSessions: 2000 }], opts);
    expect(r.winnerBucket).toBeNull();
    expect(r.leaderBucket).toBe("a");
  });

  it("does not crown a significant but negative-lift variant", () => {
    const r = pickWinner([{ bucket: "a", zScore: -2.6, relativeLift: -0.3, minBucketSessions: 2000 }], opts);
    expect(r.winnerBucket).toBeNull();
  });

  it("blocks a significant winner that fails the session floor (noise guard)", () => {
    const r = pickWinner([{ bucket: "a", zScore: 3, relativeLift: 0.5, minBucketSessions: 40 }], opts);
    expect(r.winnerBucket).toBeNull();
    expect(r.leaderBucket).toBe("a");
  });
});
