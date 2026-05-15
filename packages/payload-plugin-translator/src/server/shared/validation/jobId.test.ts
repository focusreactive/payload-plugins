import { describe, it, expect } from "vitest";

import { JobIdSchema } from "./jobId";

describe("JobIdSchema", () => {
  describe("accepts and normalizes", () => {
    it("accepts a numeric autoincrement id and converts to string", () => {
      const result = JobIdSchema.safeParse(42);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe("42");}
    });

    it("accepts zero as a valid id", () => {
      const result = JobIdSchema.safeParse(0);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe("0");}
    });

    it("accepts a UUID string verbatim", () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const result = JobIdSchema.safeParse(uuid);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe(uuid);}
    });

    it("accepts a MongoDB ObjectId hex string verbatim", () => {
      const objectId = "507f1f77bcf86cd799439011";
      const result = JobIdSchema.safeParse(objectId);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe(objectId);}
    });

    it("accepts a custom slug-style string", () => {
      const result = JobIdSchema.safeParse("post-123_v2");
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe("post-123_v2");}
    });

    it("accepts a stringified numeric id", () => {
      const result = JobIdSchema.safeParse("42");
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe("42");}
    });

    it("accepts a nanoid", () => {
      // 21-char default nanoid alphabet (A-Z, a-z, 0-9, _, -)
      const nanoid = "V1StGXR8_Z5jdHi6B-myT";
      const result = JobIdSchema.safeParse(nanoid);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe(nanoid);}
    });

    it("accepts a cuid", () => {
      // collision-resistant unique id, starts with `c` + base36 fields
      const cuid = "cl0a1b2c3d4e5f6g7h8i9j";
      const result = JobIdSchema.safeParse(cuid);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe(cuid);}
    });

    it("accepts a ULID", () => {
      // Crockford base32, 26 chars, lexicographically sortable
      const ulid = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
      const result = JobIdSchema.safeParse(ulid);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe(ulid);}
    });

    it("accepts a composite/tenanted id with a separator", () => {
      // some apps namespace ids by tenant/scope
      const composite = "tenant-1/post-42";
      const result = JobIdSchema.safeParse(composite);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe(composite);}
    });

    it("accepts a Sanity-style document id", () => {
      // Sanity uses dot-separated namespaces (e.g. drafts.<docId>)
      const sanityId = "drafts.a1b2c3d4-e5f6-7890-abcd-ef0123456789";
      const result = JobIdSchema.safeParse(sanityId);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe(sanityId);}
    });

    it("accepts an id with Unicode characters", () => {
      // some apps use human-readable slugs with diacritics or non-Latin scripts
      const unicodeId = "статья-1";
      const result = JobIdSchema.safeParse(unicodeId);
      expect(result.success).toBe(true);
      if (result.success) {expect(result.data).toBe(unicodeId);}
    });
  });

  describe("rejects", () => {
    it("rejects the empty string", () => {
      expect(JobIdSchema.safeParse("").success).toBe(false);
    });

    it("rejects the literal 'undefined' string (common HTTP serialization bug)", () => {
      expect(JobIdSchema.safeParse("undefined").success).toBe(false);
    });

    it("rejects NaN", () => {
      expect(JobIdSchema.safeParse(Number.NaN).success).toBe(false);
    });

    it("rejects Infinity", () => {
      expect(JobIdSchema.safeParse(Infinity).success).toBe(false);
    });

    it("rejects null", () => {
      expect(JobIdSchema.safeParse(null).success).toBe(false);
    });

    it("rejects undefined", () => {
      expect(JobIdSchema.safeParse().success).toBe(false);
    });

    it("rejects booleans", () => {
      expect(JobIdSchema.safeParse(true).success).toBe(false);
      expect(JobIdSchema.safeParse(false).success).toBe(false);
    });

    it('rejects objects (no implicit toString coercion to "[object Object]")', () => {
      expect(JobIdSchema.safeParse({}).success).toBe(false);
      expect(JobIdSchema.safeParse({ id: "1" }).success).toBe(false);
    });

    it("rejects arrays", () => {
      expect(JobIdSchema.safeParse([]).success).toBe(false);
      expect(JobIdSchema.safeParse([1, 2]).success).toBe(false);
    });
  });
});
