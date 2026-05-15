import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { LazyMap } from "./LazyMap";

interface TestEntry {
  id: string;
  status: "running" | "completed" | "failed";
  updatedAt: number;
}

const createEntry = (
  id: string,
  status: TestEntry["status"] = "completed",
  updatedAt: number = Date.now()
): TestEntry => ({
  id,
  status,
  updatedAt,
});

const defaultOptions = {
  getTimestamp: (entry: TestEntry) => entry.updatedAt,
  isRemovable: (entry: TestEntry) =>
    entry.status === "completed" || entry.status === "failed",
};

describe("LazyMap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("basic Map operations", () => {
    it("sets and gets values", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);
      const entry = createEntry("1");

      map.set("key1", entry);

      expect(map.get("key1")).toBe(entry);
    });

    it("returns undefined for non-existent keys", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);

      expect(map.get("non-existent")).toBeUndefined();
    });

    it("deletes values", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);
      map.set("key1", createEntry("1"));

      const result = map.delete("key1");

      expect(result).toBe(true);
      expect(map.get("key1")).toBeUndefined();
    });

    it("returns false when deleting non-existent key", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);

      expect(map.delete("non-existent")).toBe(false);
    });

    it("checks if key exists with has()", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);
      map.set("key1", createEntry("1"));

      expect(map.has("key1")).toBe(true);
      expect(map.has("key2")).toBe(false);
    });

    it("returns correct size", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);

      expect(map.size).toBe(0);

      map.set("key1", createEntry("1"));
      expect(map.size).toBe(1);

      map.set("key2", createEntry("2"));
      expect(map.size).toBe(2);
    });

    it("iterates over values()", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);
      const entry1 = createEntry("1");
      const entry2 = createEntry("2");
      map.set("key1", entry1);
      map.set("key2", entry2);

      const values = [...map.values()];

      expect(values).toEqual([entry1, entry2]);
    });

    it("iterates over entries()", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);
      const entry1 = createEntry("1");
      const entry2 = createEntry("2");
      map.set("key1", entry1);
      map.set("key2", entry2);

      const entries = [...map.entries()];

      expect(entries).toEqual([
        ["key1", entry1],
        ["key2", entry2],
      ]);
    });

    it("supports for...of iteration", () => {
      const map = new LazyMap<string, TestEntry>(defaultOptions);
      const entry1 = createEntry("1");
      const entry2 = createEntry("2");
      map.set("key1", entry1);
      map.set("key2", entry2);

      const entries: [string, TestEntry][] = [];
      for (const entry of map) {
        entries.push(entry);
      }

      expect(entries).toEqual([
        ["key1", entry1],
        ["key2", entry2],
      ]);
    });
  });

  describe("TTL cleanup", () => {
    it("removes expired removable entries on set()", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        ttlMs: 1000, // 1 second
      });

      const now = Date.now();
      map.set("old", createEntry("old", "completed", now));

      vi.advanceTimersByTime(1500); // 1.5 seconds later

      map.set("new", createEntry("new", "completed", Date.now()));

      expect(map.has("old")).toBe(false);
      expect(map.has("new")).toBe(true);
    });

    it("does not remove non-removable entries even if expired", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        ttlMs: 1000,
      });

      const now = Date.now();
      map.set("running", createEntry("running", "running", now));

      vi.advanceTimersByTime(1500);

      map.set("new", createEntry("new", "completed", Date.now()));

      expect(map.has("running")).toBe(true); // Still there because status is 'running'
    });

    it("does not remove entries within TTL", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        ttlMs: 1000,
      });

      const now = Date.now();
      map.set("recent", createEntry("recent", "completed", now));

      vi.advanceTimersByTime(500); // Only 0.5 seconds

      map.set("new", createEntry("new", "completed", Date.now()));

      expect(map.has("recent")).toBe(true);
    });

    it("skips TTL cleanup when ttlMs is Infinity", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        // ttlMs defaults to Infinity
      });

      const oldTime = Date.now();
      map.set("old", createEntry("old", "completed", oldTime));

      vi.advanceTimersByTime(1000 * 60 * 60 * 24); // 1 day later

      map.set("new", createEntry("new", "completed", Date.now()));

      expect(map.has("old")).toBe(true); // Still there
    });
  });

  describe("maxSize cleanup", () => {
    it("removes oldest removable entries when exceeding maxSize", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 2,
      });

      const now = Date.now();
      map.set("entry1", createEntry("1", "completed", now));
      map.set("entry2", createEntry("2", "completed", now + 100));
      map.set("entry3", createEntry("3", "completed", now + 200));

      expect(map.size).toBe(2);
      expect(map.has("entry1")).toBe(false); // Oldest removed
      expect(map.has("entry2")).toBe(true);
      expect(map.has("entry3")).toBe(true);
    });

    it("removes multiple entries to reach maxSize", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 1,
      });

      const now = Date.now();
      map.set("entry1", createEntry("1", "completed", now));
      map.set("entry2", createEntry("2", "completed", now + 100));
      map.set("entry3", createEntry("3", "completed", now + 200));

      expect(map.size).toBe(1);
      expect(map.has("entry3")).toBe(true);
    });

    it("does not remove non-removable entries", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 2,
      });

      const now = Date.now();
      map.set("running1", createEntry("r1", "running", now));
      map.set("running2", createEntry("r2", "running", now + 100));
      map.set("running3", createEntry("r3", "running", now + 200));

      // All 3 entries remain because running entries cannot be removed
      expect(map.size).toBe(3);
      expect(map.has("running1")).toBe(true);
      expect(map.has("running2")).toBe(true);
      expect(map.has("running3")).toBe(true);
    });

    it("removes removable entries first, keeping non-removable", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 2,
      });

      const now = Date.now();
      map.set("completed1", createEntry("c1", "completed", now));
      map.set("running", createEntry("r1", "running", now + 100));
      map.set("completed2", createEntry("c2", "completed", now + 200));

      expect(map.size).toBe(2);
      expect(map.has("completed1")).toBe(false); // Oldest removable removed
      expect(map.has("running")).toBe(true); // Non-removable kept
      expect(map.has("completed2")).toBe(true);
    });
  });

  describe("combined TTL and maxSize", () => {
    it("applies both TTL and maxSize cleanup", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 3,
        ttlMs: 1000,
      });

      const now = Date.now();
      map.set("expired1", createEntry("e1", "completed", now));
      map.set("expired2", createEntry("e2", "completed", now));

      vi.advanceTimersByTime(1500);

      const laterNow = Date.now();
      map.set("recent1", createEntry("r1", "completed", laterNow));
      map.set("recent2", createEntry("r2", "completed", laterNow + 100));
      map.set("recent3", createEntry("r3", "completed", laterNow + 200));

      // Expired entries removed by TTL, then maxSize enforced
      expect(map.has("expired1")).toBe(false);
      expect(map.has("expired2")).toBe(false);
      expect(map.size).toBe(3);
    });
  });

  describe("edge cases", () => {
    it("handles empty map", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 5,
        ttlMs: 1000,
      });

      expect(map.size).toBe(0);
      expect([...map.values()]).toEqual([]);
    });

    it("handles maxSize of 0", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 0,
      });

      map.set("key1", createEntry("1", "completed", Date.now()));

      // Entry is removed immediately because maxSize is 0
      expect(map.size).toBe(0);
    });

    it("overwrites existing key without affecting count", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 2,
      });

      const now = Date.now();
      map.set("key1", createEntry("1", "completed", now));
      map.set("key2", createEntry("2", "completed", now + 100));

      // Overwrite key1
      map.set("key1", createEntry("1-updated", "completed", now + 200));

      expect(map.size).toBe(2);
      expect(map.get("key1")?.id).toBe("1-updated");
    });

    it("handles failed status as removable", () => {
      const map = new LazyMap<string, TestEntry>({
        ...defaultOptions,
        maxSize: 1,
      });

      const now = Date.now();
      map.set("failed", createEntry("f1", "failed", now));
      map.set("new", createEntry("n1", "completed", now + 100));

      expect(map.size).toBe(1);
      expect(map.has("failed")).toBe(false);
      expect(map.has("new")).toBe(true);
    });
  });
});
