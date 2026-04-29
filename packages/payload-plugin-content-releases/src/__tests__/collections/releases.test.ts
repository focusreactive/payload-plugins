import { describe, it, expect } from "vitest";
import { buildReleasesCollection } from "../../collections/releases";
import { RELEASES_SLUG, RELEASE_STATUSES } from "../../constants";

describe("releases collection", () => {
  const collection = buildReleasesCollection();

  it("should have the correct slug", () => {
    expect(collection.slug).toBe(RELEASES_SLUG);
  });

  it("should have required name field", () => {
    const nameField = collection.fields.find((f: any) => f.name === "name") as any;
    expect(nameField).toBeDefined();
    expect(nameField.type).toBe("text");
    expect(nameField.required).toBe(true);
  });

  it("should have status field with all valid statuses", () => {
    const statusField = collection.fields.find((f: any) => f.name === "status") as any;
    expect(statusField).toBeDefined();
    expect(statusField.type).toBe("select");
    const optionValues = statusField.options.map((o: any) => o.value ?? o);
    for (const status of RELEASE_STATUSES) {
      expect(optionValues).toContain(status);
    }
  });

  it("should have scheduledAt date field", () => {
    const field = collection.fields.find((f: any) => f.name === "scheduledAt") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("date");
  });

  it("should have publishedAt date field", () => {
    const field = collection.fields.find((f: any) => f.name === "publishedAt") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("date");
  });

  it("should have description textarea field", () => {
    const field = collection.fields.find((f: any) => f.name === "description") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("textarea");
  });

  it("should have rollbackSnapshot json field", () => {
    const field = collection.fields.find((f: any) => f.name === "rollbackSnapshot") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("json");
  });

  it("should have errorLog json field", () => {
    const field = collection.fields.find((f: any) => f.name === "errorLog") as any;
    expect(field).toBeDefined();
    expect(field.type).toBe("json");
  });

  it("should apply custom access if provided", () => {
    const customAccess = { read: () => true };
    const col = buildReleasesCollection({ access: customAccess });
    expect(col.access?.read).toBe(customAccess.read);
  });
});

describe("buildReleasesCollection — items join defaultColumns", () => {
  it("does not include 'status' in items join defaultColumns", () => {
    const config = buildReleasesCollection();
    const itemsField = config.fields.find(
      (f) => "name" in f && f.name === "items",
    ) as any;
    expect(itemsField.admin.defaultColumns).not.toContain("status");
  });
});

describe("buildReleasesCollection — status field display", () => {
  it("registers a custom Field component for status", () => {
    const config = buildReleasesCollection();
    const statusField = config.fields.find(
      (f) => "name" in f && f.name === "status",
    ) as any;
    expect(statusField.admin?.components?.Field).toContain("ReleaseStatusField");
  });

  it("keeps status field type as select for validation", () => {
    const config = buildReleasesCollection();
    const statusField = config.fields.find(
      (f) => "name" in f && f.name === "status",
    ) as any;
    expect(statusField.type).toBe("select");
    expect(statusField.required).toBe(true);
  });
});

describe("buildReleasesCollection — items join field", () => {
  it("uses 'Resources' as the items field label", () => {
    const config = buildReleasesCollection();
    const itemsField = config.fields.find(
      (f) => "name" in f && f.name === "items",
    ) as any;
    expect(itemsField.label).toBe("Resources");
  });
});
