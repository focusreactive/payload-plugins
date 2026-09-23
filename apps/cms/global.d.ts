// Side-effect CSS imports
declare module "*.css";
declare module "*.scss";
declare module "@payloadcms/next/css";

// No @types/jsdom in this monorepo; only the constructor this codebase
// actually calls (passed straight through to convertHTMLToLexical) needs a
// shape here.
declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string, options?: Record<string, unknown>);
    window: typeof globalThis;
  }
}
