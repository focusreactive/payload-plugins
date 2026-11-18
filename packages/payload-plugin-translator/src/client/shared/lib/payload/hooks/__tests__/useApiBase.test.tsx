// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { TranslateKitConfigProvider } from "../../../../config/index.js";
import { useApiBase } from "../useApiBase.js";

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({
    config: { serverURL: "https://public.example.com", routes: { api: "/cms-api" } },
  }),
}));

const wrapper = ({ children }: PropsWithChildren) => (
  <TranslateKitConfigProvider
    config={{
      basePath: "/custom-translate",
      abilities: {
        translate: true,
        cancel: true,
        runNow: true,
        staleness: true,
        translateField: true,
      },
      collections: {},
    }}
  >
    {children}
  </TranslateKitConfigProvider>
);

describe("the API base", () => {
  it("is Payload's API route plus the plugin's base path, relative to the admin's origin", () => {
    expect(renderHook(() => useApiBase(), { wrapper }).result.current).toBe(
      "/cms-api/custom-translate"
    );
  });
});
