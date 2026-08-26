import { describe, expect, it } from "vitest";

import { isModuleNotFound, loadOpenAIClient } from "./loadOpenAIClient";

type ThrownError = Error & { code?: string };

function sdkStub(construct: (options: unknown) => object) {
  return {
    default: class {
      constructor(options: unknown) {
        Object.assign(this, construct(options));
      }
    },
  };
}

const WORDINGS = [
  {
    runtime: "Node ESM",
    code: "ERR_MODULE_NOT_FOUND",
    missing: "Cannot find package 'openai' imported from /app/src/index.js",
    transitive: "Cannot find package 'some-dep' imported from /app/node_modules/openai/index.mjs",
  },
  {
    runtime: "Node CJS (what openai actually is)",
    code: "MODULE_NOT_FOUND",
    missing: "Cannot find module 'openai'\nRequire stack:\n- /app/src/index.js",
    transitive:
      "Cannot find module 'some-dep'\nRequire stack:\n- /app/node_modules/openai/index.js",
  },
  {
    runtime: "Vite / Rollup",
    code: undefined,
    missing: 'Failed to resolve import "openai" from "src/index.ts"',
    transitive: 'Failed to resolve import "some-dep" from "node_modules/openai/index.js"',
  },
  {
    runtime: "webpack",
    code: undefined,
    missing: "Module not found: Can't resolve 'openai' in '/app/src'",
    transitive: "Module not found: Can't resolve 'some-dep' in '/app/node_modules/openai'",
  },
] as const;

function resolutionError(message: string, code?: string) {
  return code ? Object.assign(new Error(message), { code }) : new Error(message);
}

describe("isModuleNotFound", () => {
  for (const { runtime, code, missing, transitive } of WORDINGS) {
    it(`recognises a missing package — ${runtime}`, () => {
      expect(isModuleNotFound(resolutionError(missing, code), "openai")).toBe(true);
    });

    it(`does NOT blame openai when one of ITS dependencies is missing — ${runtime}`, () => {
      expect(isModuleNotFound(resolutionError(transitive, code), "openai")).toBe(false);
    });
  }

  it("recognises vitest's own wording, which carries no code", () => {
    const cause = new Error(
      "Failed to load url openai (resolved id: openai). Does the file exist?"
    );

    expect(isModuleNotFound(cause, "openai")).toBe(true);
  });

  it("rejects an unrelated failure", () => {
    expect(isModuleNotFound(new Error("boom while evaluating the module"), "openai")).toBe(false);
  });

  it("rejects a non-error throw", () => {
    expect(isModuleNotFound("just a string", "openai")).toBe(false);
    expect(isModuleNotFound(null, "openai")).toBe(false);
  });
});

describe("loadOpenAIClient", () => {
  it("constructs a client and forwards the options", async () => {
    const client = (await loadOpenAIClient(
      { apiKey: "sk-test", timeout: 60_000, maxRetries: 2 },
      () => Promise.resolve(sdkStub((options) => ({ options })))
    )) as unknown as { options: unknown };

    expect(client.options).toEqual({ apiKey: "sk-test", timeout: 60_000, maxRetries: 2 });
  });

  it("turns a missing package into ProviderConfigurationError naming the fix", async () => {
    const failure = (await loadOpenAIClient({ apiKey: "sk-test" }, () => {
      throw Object.assign(
        new Error("Cannot find package 'openai' imported from /app/src/index.js"),
        { code: "ERR_MODULE_NOT_FOUND" }
      );
    }).catch((e: unknown) => e)) as ThrownError;

    expect(failure.name).toBe("ProviderConfigurationError");
    expect(failure.code).toBe("config");
    expect(failure.message).toContain("openai");
    expect(failure.message).toContain("client");
    expect(failure.message).not.toContain("Cannot find");
  });

  it("keeps the original resolution failure on cause", async () => {
    const original = Object.assign(
      new Error("Cannot find package 'openai' imported from /app/x.js"),
      {
        code: "ERR_MODULE_NOT_FOUND",
      }
    );

    const failure = (await loadOpenAIClient({ apiKey: "sk-test" }, () => {
      throw original;
    }).catch((e: unknown) => e)) as ThrownError;

    expect(failure.cause).toBe(original);
  });

  it("distinguishes an installed-but-failing package from a missing one", async () => {
    const failure = (await loadOpenAIClient({ apiKey: "sk-test" }, () => {
      throw new Error("boom while evaluating the module");
    }).catch((e: unknown) => e)) as ThrownError;

    expect(failure.name).toBe("ProviderConfigurationError");
    expect(failure.message).toContain("failed to load");
    expect(failure.message).not.toContain("Install it");
  });

  it("reports a constructor throw as a configuration failure", async () => {
    const failure = (await loadOpenAIClient({ apiKey: "sk-test-abcdef123456" }, () =>
      Promise.resolve(
        sdkStub(() => {
          throw new Error("bad key sk-test-abcdef123456");
        })
      )
    ).catch((e: unknown) => e)) as ThrownError;

    expect(failure.name).toBe("ProviderConfigurationError");
    expect(failure.code).toBe("config");
    expect(failure.cause).toBeInstanceOf(Error);
    // The message reaches an HTTP response body, and the SDK's own error quoted the key.
    expect(failure.message).not.toContain("sk-test-abcdef123456");
    expect(JSON.stringify(failure)).not.toContain("sk-test-abcdef123456");
  });
});
