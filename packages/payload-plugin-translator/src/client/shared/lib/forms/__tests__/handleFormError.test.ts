// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "../../../api/errors/ApiRequestError.js";
import { NextApiError } from "../../../api/handleApiError.js";
import { handleFormError } from "../handle-form-error.js";

type Fields = { target_lng: string };

const aForm = () => renderHook(() => useForm<Fields>()).result.current;

const issue = {
  code: "custom" as const,
  path: ["target_lng"],
  message: "Select at least one language",
};

describe("a failed submit shown on the form", () => {
  it("puts each field error an ApiRequestError carries beside its field", () => {
    const form = aForm();

    handleFormError(
      new ApiRequestError("rejected", "Invalid", { status: 400, details: [issue] }),
      form
    );

    expect(form.getFieldState("target_lng").error?.message).toBe("Select at least one language");
  });

  it("still reads field errors from the old read hooks' error", () => {
    const form = aForm();

    handleFormError(new NextApiError("Invalid", [issue]), form);

    expect(form.getFieldState("target_lng").error?.message).toBe("Select at least one language");
  });

  it("shows an error with no field errors as the form's own", () => {
    const form = aForm();
    const setError = vi.spyOn(form, "setError");

    handleFormError(new ApiRequestError("busy", "Already translating"), form);

    expect(setError).toHaveBeenCalledWith("root", { message: "Already translating" });
  });
});
