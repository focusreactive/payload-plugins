import { describe, expect, it } from "vitest";

import { isModuleNotFound, loadOpenAIClient } from "./loadOpenAIClient";

type ThrownError = Error & { code?: string };

/**
 * One class literal, reused for every SDK stub — the repo allows a single class per file, and two
 * hand-written stub classes would break that for no gain.
 */
function sdkStub(construct: (options: unknown) => object) {
  return {
    default: class {
      constructor(options: unknown) {
        Object.assign(this, construct(options));
      }
    },
  };
}

/**
 * One row per runtime wording, each in both shapes: openai itself missing, and openai installed with
 * a missing dependency of its own. The second column is the one that matters — every wording names
 * the importer too, and that path contains "openai", so a guard that searches the whole message gets
 * it backwards and tells the user to install a package they already have.
 *
 * Table-driven on purpose: the guard reads a list of wordings and a list of importer separators, and
 * the two can only stay in step if every wording is exercised in both directions. An earlier version
 * handled exactly one of these four — and not the one `openai`'s CommonJS packaging actually produces.
 */
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

  // The importer is substituted rather than the specifier: the specifier has to stay a module-level
  // constant so deployment file-tracers can follow it (see importOpenAISdk). The failure handed in
  // here is the real shape Node raises for a missing package.
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
    // Never the raw resolution failure — that tells a consumer nothing about what to do.
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

  // Installed but broken is a different problem with a different fix; telling the consumer to install
  // it again would send them after the wrong thing.
  it("distinguishes an installed-but-failing package from a missing one", async () => {
    const failure = (await loadOpenAIClient({ apiKey: "sk-test" }, () => {
      throw new Error("boom while evaluating the module");
    }).catch((e: unknown) => e)) as ThrownError;

    expect(failure.name).toBe("ProviderConfigurationError");
    expect(failure.message).toContain("failed to load");
    expect(failure.message).not.toContain("Install it");
  });

  // The SDK validates some options in its constructor. Left unwrapped this would be the one failure
  // on this path that escapes the taxonomy — and it is a *configuration* failure, not a transport
  // one: no request was attempted, so calling it transport would be untrue.
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
