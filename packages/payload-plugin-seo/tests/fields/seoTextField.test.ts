import { describe, expect, it } from "vitest";
import { seoTextField } from "../../src/fields/seoTextField";

describe("seoTextField", () => {
  it("produces a text field with the SeoField component + clientProps", () => {
    const f = seoTextField({ name: "title", kind: "title", showButton: true });
    expect(f.type).toBe("text");
    expect(f.name).toBe("title");
    const comp = (
      f.admin as { components: { Field: { path: string; clientProps: Record<string, unknown> } } }
    ).components.Field;
    expect(comp.path).toContain("/components/SeoField#SeoField");
    expect(comp.clientProps).toMatchObject({
      kind: "title",
      showButton: true,
      generateOnPublish: false,
    });
  });

  it("adds a beforeChange hook only when generateOnPublish is set", () => {
    expect(seoTextField({ name: "t", kind: "title" }).hooks?.beforeChange ?? []).toHaveLength(0);
    expect(
      seoTextField({ name: "t", kind: "title", generateOnPublish: true }).hooks?.beforeChange
    ).toHaveLength(1);
  });

  it("makes the description field a textarea and the title a text field", () => {
    expect(seoTextField({ name: "title", kind: "title" }).type).toBe("text");
    expect(seoTextField({ name: "description", kind: "description" }).type).toBe("textarea");
  });

  it("passes through label, required, localized, range", () => {
    const f = seoTextField({
      name: "d",
      kind: "description",
      required: true,
      localized: true,
      label: "Meta description",
      range: { min: 100, max: 150 },
    });
    expect(f.required).toBe(true);
    expect(f.localized).toBe(true);
    expect(f.label).toBe("Meta description");
    const comp = (f.admin as { components: { Field: { clientProps: { range: unknown } } } })
      .components.Field;
    expect(comp.clientProps.range).toEqual({ min: 100, max: 150 });
  });
});
