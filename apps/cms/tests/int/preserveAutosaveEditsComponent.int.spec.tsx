import { render } from "@testing-library/react";
import type { FormState } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreserveAutosaveEdits } from "@/components/admin/PreserveAutosaveEdits";

const form = vi.hoisted(() => ({
  dispatchFields: vi.fn(),
  fields: {} as FormState,
  locale: "en",
  modified: false,
  savedDoc: {} as Record<string, unknown>,
  setModified: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useAllFormFields: () => [form.fields, form.dispatchFields],
  useDocumentInfo: () => ({ data: form.savedDoc }),
  useForm: () => ({ setModified: form.setModified }),
  useFormModified: () => form.modified,
  useLocale: () => ({ code: form.locale }),
}));

const field = (value: unknown, isModified?: true) =>
  ({
    initialValue: value,
    valid: true,
    value,
    ...(isModified && { isModified }),
  }) as FormState[string];

describe("PreserveAutosaveEdits", () => {
  beforeEach(() => {
    form.dispatchFields.mockClear();
    form.setModified.mockClear();
    form.locale = "en";
    form.modified = true;
    form.savedDoc = {};
  });

  it("puts the edit mark back on a field after the user moves to another field", () => {
    form.fields = { subtitle: field(""), title: field("one two", true) };
    const { rerender } = render(<PreserveAutosaveEdits />);

    form.fields = { subtitle: field("s", true), title: field("one two") };
    rerender(<PreserveAutosaveEdits />);

    expect(form.dispatchFields).toHaveBeenCalledWith({
      formState: { title: { ...form.fields.title, isModified: true } },
      type: "UPDATE_MANY",
    });
  });

  it("marks the form modified when the saved document is behind the edits", () => {
    form.fields = { title: field("one two four", true) };
    const { rerender } = render(<PreserveAutosaveEdits />);

    form.modified = false;
    form.savedDoc = { title: "one two" };
    rerender(<PreserveAutosaveEdits />);

    expect(form.setModified).toHaveBeenCalledWith(true);
  });

  it("leaves the form alone once the edits are saved", () => {
    form.fields = { title: field("one two four", true) };
    const { rerender } = render(<PreserveAutosaveEdits />);

    form.modified = false;
    form.savedDoc = { title: "one two four" };
    rerender(<PreserveAutosaveEdits />);

    expect(form.setModified).not.toHaveBeenCalled();
  });

  it("does not flag the form after a reset that keeps the saved document", () => {
    form.savedDoc = { title: "draft" };
    form.fields = { title: field("draft edit", true) };
    const { rerender } = render(<PreserveAutosaveEdits />);

    form.modified = false;
    form.fields = { title: field("published") };
    rerender(<PreserveAutosaveEdits />);

    expect(form.setModified).not.toHaveBeenCalled();
  });

  it("forgets edited fields after a locale switch", () => {
    form.fields = { subtitle: field(""), title: field("hello", true) };
    const { rerender } = render(<PreserveAutosaveEdits />);

    form.locale = "es";
    form.fields = { subtitle: field("hola", true), title: field("titulo") };
    rerender(<PreserveAutosaveEdits />);

    expect(form.dispatchFields).not.toHaveBeenCalledWith(
      expect.objectContaining({ formState: expect.objectContaining({ title: expect.anything() }) })
    );
  });
});
