import { render } from "@testing-library/react";
import type { FormState } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreserveAutosaveEdits } from "@/components/admin/PreserveAutosaveEdits";

const form = vi.hoisted(() => ({
  dispatchFields: vi.fn(),
  fields: {} as FormState,
  modified: false,
  savedDoc: {} as Record<string, unknown>,
  setModified: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useAllFormFields: () => [form.fields, form.dispatchFields],
  useDocumentInfo: () => ({ data: form.savedDoc }),
  useForm: () => ({ setModified: form.setModified }),
  useFormModified: () => form.modified,
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
});
