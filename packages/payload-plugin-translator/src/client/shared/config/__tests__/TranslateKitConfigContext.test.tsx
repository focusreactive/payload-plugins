// @vitest-environment jsdom
import { render, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TranslateKitConfig } from "../../../../types/wire/TranslateKitConfig.js";
import {
  TranslateKitConfigMissingError,
  TranslateKitConfigProvider,
  useTranslateKitConfig,
} from "../TranslateKitConfigContext.js";

const config: TranslateKitConfig = {
  basePath: "/custom-translate",
  abilities: {
    translate: true,
    cancel: false,
    runNow: false,
    staleness: true,
    translateField: true,
  },
  collections: { posts: { autoTranslateTargets: ["de"] } },
};

function ReadsConfig() {
  useTranslateKitConfig();
  return null;
}

describe("the admin config", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is refused by name outside its provider, rather than guessed", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<ReadsConfig />)).toThrow(TranslateKitConfigMissingError);
  });

  it("is the whole config the server sent, inside its provider", () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <TranslateKitConfigProvider config={config}>{children}</TranslateKitConfigProvider>
    );

    expect(renderHook(() => useTranslateKitConfig(), { wrapper }).result.current).toEqual(config);
  });
});
