import { ProviderConfigurationError } from "../shared";
import type { OpenAIClientShape } from "./OpenAI.shapes";

/**
 * The SDK's module specifier, held in a constant rather than written inline.
 *
 * This is what keeps `openai` out of the package's type graph. A literal `import("openai")` is
 * resolved by the type-checker exactly like a static import, so it would put the SDK back into the
 * emitted declarations and make it mandatory for every consumer — the very defect this change
 * removes. Through a constant, the specifier is resolved at runtime only, by the consumer who
 * actually asked for the `apiKey` path.
 */
const OPENAI_MODULE = "openai";

/** Node's codes for "that module isn't installed", as opposed to "it failed while loading". */
const MODULE_NOT_FOUND_CODES = new Set(["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND"]);

/**
 * Bundlers and test runners re-throw resolution failures in their own shapes, and several drop the
 * `code` on the way. The wording is the more portable signal, so both are checked.
 */
const MODULE_NOT_FOUND_MESSAGES = [
  "cannot find module", // Node CJS
  "cannot find package", // Node ESM, bare specifier
  "failed to resolve", // Vite / Rollup
  "failed to load url", // Vite dev + vitest
  "module not found", // webpack and friends
];

/**
 * Every way the runtimes above name the *importer*, paired with the wording it belongs to.
 *
 * This list is what makes the guard below correct, and it has to stay in step with the one above:
 * each of these messages names two things — what could not be found, and who asked for it — and the
 * second half is the trap. When `openai` is installed but one of *its* dependencies is missing, the
 * importer half is a path inside `node_modules/openai`, so any search over the whole message finds
 * "openai" and concludes openai is missing.
 */
const IMPORTER_CLAUSES = [
  " imported from ", // Node ESM:  Cannot find package 'X' imported from /path/to/Y
  "require stack:", // Node CJS:  Cannot find module 'X'\nRequire stack:\n- /path/to/Y
  " from ", // Vite:      Failed to resolve import "X" from "Y"
  " in ", // webpack:   Can't resolve 'X' in 'Y'
];

/** Options forwarded to the SDK client we construct on the `apiKey` path. */
export type OpenAIClientOptions = {
  /**
   * Left `undefined` rather than defaulted to `""` on purpose. The SDK's own guard is
   * `apiKey === undefined`, and its environment fallback is a default parameter, so an explicit empty
   * string defeats both: the client constructs silently and every request comes back 401. Passing it
   * through unchanged keeps the SDK's own diagnosis — "The OPENAI_API_KEY environment variable is
   * missing or empty" — which names the problem far better than a generic transport failure would.
   */
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
};

type OpenAISdkModule = { default: new (opts: OpenAIClientOptions) => unknown };

/**
 * The single site that names the SDK, and the reason it is a function rather than a parameter.
 *
 * Deployment file-tracers (`@vercel/nft`, behind Vercel builds and Next's `output: "standalone"`)
 * resolve `import()` statically to decide what to copy into the deployment. A **module-level
 * constant** they can follow: `openai` is traced and shipped. A specifier arriving as a *function
 * parameter* they cannot — and they emit no warning about it, so the package is silently pruned and
 * the first translation in production fails with "install `openai`" for a package that is installed.
 *
 * So the specifier stays fixed here, and tests substitute this whole function instead.
 */
async function importOpenAISdk(): Promise<OpenAISdkModule> {
  return (await import(OPENAI_MODULE)) as OpenAISdkModule;
}

/** Loads the SDK module. Overridable for tests only; not part of the package's public surface. */
export type OpenAISdkImporter = () => Promise<OpenAISdkModule>;

/** Drops every importer clause, leaving only the half that names what could not be found. */
function whatCouldNotBeFound(text: string): string {
  return IMPORTER_CLAUSES.reduce((remaining, clause) => remaining.split(clause)[0], text);
}

/**
 * Was it *this* module that could not be found, or something it depends on?
 *
 * The distinction decides which of two very different sentences the user reads, and getting it wrong
 * sends them after a package they already have.
 *
 * Every runtime names both halves — `Cannot find package 'some-dep' imported from
 * /…/node_modules/openai/index.mjs` — so a plain substring test finds "openai" in the *importer* path
 * and reports openai as missing when it is installed and one of its own dependencies is not. Each
 * runtime also uses its own separator, and `openai` ships as CommonJS, so the wording that actually
 * turns up here is Node's `Require stack:` form rather than the ESM one. Hence a list rather than a
 * single split: cut every importer clause first, then look.
 *
 * Exported for its own test. It is not re-exported from any barrel and is not public API.
 */
export function isModuleNotFound(cause: unknown, moduleSpecifier: string): boolean {
  if (typeof cause !== "object" || cause === null) return false;

  const message = (cause as { message?: unknown }).message;
  if (typeof message !== "string") return false;

  const text = message.toLowerCase();
  if (!whatCouldNotBeFound(text).includes(moduleSpecifier.toLowerCase())) return false;

  const code = (cause as { code?: unknown }).code;
  if (typeof code === "string" && MODULE_NOT_FOUND_CODES.has(code)) return true;

  return MODULE_NOT_FOUND_MESSAGES.some((phrase) => text.includes(phrase));
}

/**
 * Constructs an OpenAI SDK client, loading the package on first use.
 *
 * This is the only file in the package that names `openai`, and it is only reached when a consumer
 * passed an `apiKey` rather than their own client. A consumer who injects a client never causes this
 * module's import to run at all.
 *
 * Three failures are told apart on purpose, because they need different fixes: the package is not
 * installed (install it, or pass a `client`), the package is installed but blew up while loading (a
 * broken install — not something a consumer fixes by installing it again), and the constructor
 * rejected the options (an empty key, say).
 *
 * @since 0.11.0
 */
export async function loadOpenAIClient(
  options: OpenAIClientOptions,
  /** Test seam — see {@link importOpenAISdk} for why this is a function and not a specifier. */
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

    // Resolved, then failed while evaluating. Telling this consumer to install the package would
    // send them after the wrong problem.
    throw new ProviderConfigurationError(
      "The `openai` package is installed but failed to load. See this error's `cause`.",
      { cause }
    );
  }

  try {
    return new sdk.default(options) as OpenAIClientShape;
  } catch (cause) {
    // A constructor failure is always a *configuration* problem — a missing key, a malformed
    // `baseURL`, the SDK's browser guard — and no request was attempted, so calling it a transport
    // failure would be literally untrue. The cause carries the SDK's own wording for whoever reads it.
    throw new ProviderConfigurationError(
      "The OpenAI client could not be constructed from the given options. See this error's `cause`.",
      { cause }
    );
  }
}
