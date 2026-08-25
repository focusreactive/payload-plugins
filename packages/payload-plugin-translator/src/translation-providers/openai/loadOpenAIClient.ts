import { ProviderConfigurationError } from "../shared";
import type { OpenAIClientShape } from "./OpenAI.shapes";

/**
 * A literal `import("openai")` is type-resolved like a static import and would put the SDK into the
 * emitted .d.ts, forcing every consumer to install it. Through a constant it resolves at runtime only.
 */
const OPENAI_MODULE = "openai";

const MODULE_NOT_FOUND_CODES = new Set(["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"]);

/**
 * Bundlers and test runners re-throw resolution failures in their own shapes, and several drop the
 * `code` on the way. The wording is the more portable signal, so both are checked.
 */
const MODULE_NOT_FOUND_MESSAGES = {
  nodeCjs: "cannot find module",
  nodeEsm: "cannot find package",
  viteRollup: "failed to resolve",
  viteDev: "failed to load url",
  webpack: "module not found",
};

/**
 * Each runtime's message names two things: what was not found and who imported it. The importer half
 * is a path inside node_modules/openai, so it must be cut off before searching for "openai".
 */
const IMPORTER_CLAUSES = {
  nodeEsm: " imported from ",
  nodeCjs: "require stack:",
  vite: " from ",
  webpack: " in ",
};

export type OpenAIClientOptions = {
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
};

type OpenAISdkModule = { default: new (opts: OpenAIClientOptions) => unknown };

/**
 * `@vercel/nft` (Vercel builds, Next `output: "standalone"`) resolves `import()` statically and can
 * follow a module-level constant but not a parameter — silently, so a parameterised specifier gets
 * `openai` pruned from the deployment and the first production translation reports it missing.
 */
async function importOpenAISdk(): Promise<OpenAISdkModule> {
  return (await import(OPENAI_MODULE)) as OpenAISdkModule;
}

export type OpenAISdkImporter = () => Promise<OpenAISdkModule>;

function whatCouldNotBeFound(text: string): string {
  return Object.values(IMPORTER_CLAUSES).reduce(
    (remaining, clause) => remaining.split(clause)[0],
    text
  );
}

/**
 * Was `moduleSpecifier` itself missing, or one of its dependencies? The importer half of the message
 * contains the openai path, so it is cut before searching.
 *
 * Exported for its own test. Not re-exported from any barrel and not public API.
 */
export function isModuleNotFound(cause: unknown, moduleSpecifier: string): boolean {
  if (typeof cause !== "object" || cause === null) return false;

  const message = (cause as { message?: unknown }).message;
  if (typeof message !== "string") return false;

  const text = message.toLowerCase();
  if (!whatCouldNotBeFound(text).includes(moduleSpecifier.toLowerCase())) return false;

  const code = (cause as { code?: unknown }).code;
  if (typeof code === "string" && MODULE_NOT_FOUND_CODES.has(code)) return true;

  return Object.values(MODULE_NOT_FOUND_MESSAGES).some((phrase) => text.includes(phrase));
}

/**
 * Constructs an OpenAI SDK client, loading the `openai` package on first use. Reached only when a
 * consumer passed `apiKey`; a consumer who injects a `client` never runs this module.
 *
 * @throws ProviderConfigurationError for a missing package, a broken install, or rejected options.
 *
 * @since 0.11.0
 */
export async function loadOpenAIClient(
  options: OpenAIClientOptions,
  importSdk: OpenAISdkImporter = importOpenAISdk
): Promise<OpenAIClientShape> {
  let sdk: OpenAISdkModule;

  try {
    sdk = await importSdk();
  } catch (cause) {
    if (isModuleNotFound(cause, OPENAI_MODULE)) {
      throw new ProviderConfigurationError(
        "createOpenAIProvider({ apiKey }) needs the optional `openai` package. Install it, or pass a ready-made `client` instead.",
        { cause }
      );
    }

    throw new ProviderConfigurationError(
      "The `openai` package is installed but failed to load. See this error's `cause`.",
      { cause }
    );
  }

  try {
    return new sdk.default(options) as OpenAIClientShape;
  } catch (cause) {
    throw new ProviderConfigurationError(
      "The OpenAI client could not be constructed from the given options. See this error's `cause`.",
      { cause }
    );
  }
}
