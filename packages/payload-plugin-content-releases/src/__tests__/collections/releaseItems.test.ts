import { describe, it, expect } from "vitest";
import { buildReleaseItemsCollection } from "../../collections/releaseItems";
import {
  RELEASE_ITEMS_SLUG,
  RELEASES_SLUG,
  RELEASE_ITEM_ACTIONS,
  RELEASE_ITEM_STATUSES,
} from "../../constants";

describe("release-items collection", () => {
  const enabledCollections = ["pages", "posts", "products"];
  const collection = buildReleaseItemsCollection(enabledCollections);

  it("should have the correct slug", () => {
    expect(collection.slug).toBe(RELEASE_ITEMS_SLUG);
  });

  it("should have release relationship to releases collection", () => {
    const field = collection.fields.find((f: any) => f.name === "release") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("relationship");
    expect(field.relationTo).toBe(RELEASES_SLUG);
    expect(field.required).toBe(true);
  });

  it("should have targetCollection select with enabled collections", () => {
    const field = collection.fields.find((f: any) => f.name === "targetCollection") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("select");
    const values = field.options.map((o: any) => o.value ?? o);
    expect(values).toEqual(enabledCollections);
  });

  it("should have targetDoc text field", () => {
    const field = collection.fields.find((f: any) => f.name === "targetDoc") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("text");
    expect(field.required).toBe(true);
  });

  it("should have action select field", () => {
    const field = collection.fields.find((f: any) => f.name === "action") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("select");
    const values = field.options.map((o: any) => o.value ?? o);
    for (const action of RELEASE_ITEM_ACTIONS) {
      expect(values).toContain(action);
    }
  });

  it("should have status select field", () => {
    const field = collection.fields.find((f: any) => f.name === "status") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("select");
    const values = field.options.map((o: any) => o.value ?? o);
    for (const status of RELEASE_ITEM_STATUSES) {
      expect(values).toContain(status);
    }
  });

  it("should have snapshot json field", () => {
    const field = collection.fields.find((f: any) => f.name === "snapshot") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("json");
  });

  it("should have baseVersion text field", () => {
    const field = collection.fields.find((f: any) => f.name === "baseVersion") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("text");
  });
});
