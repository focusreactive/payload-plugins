// The source monorepo depends on two plugins published to the private
// `@fr-private` npm scope. Scaffolded projects belong to people without access
// to that scope, so an untouched copy would fail at `install`. Both are wired
// through single-purpose files in `apps/cms` whose whole job is to be swappable
// — we overwrite those files here rather than editing app code, so the strip
// can never half-apply or mangle a component.
//
// Keep each stub's exported surface identical to the file it replaces.

/** Bare scope name — matches any mention, e.g. `@fr-private:registry=…` in `.npmrc`. */
export const STRIPPED_SCOPE = "@fr-private";

/** Scope as a dependency-name prefix; the slash keeps `@fr-privateX/…` from matching. */
export const STRIPPED_DEP_SCOPE = `${STRIPPED_SCOPE}/`;

/** Replaces `apps/cms/src/lib/plugins/private.ts`. */
const PRIVATE_PLUGINS_STUB = `import type { Plugin } from "payload";

// The private @fr-private plugins (visual editing, content releases) were
// removed by create-ideal-cms — they are published to a private npm scope.
// Add your own plugins here, or leave the list empty.
export const privatePlugins: Plugin[] = [];
`;

/** Replaces `apps/cms/src/lib/plugins/visual-editing/client.ts`. */
const VISUAL_EDITING_CLIENT_STUB = `"use client";

import type { ReactNode } from "react";

// Inert stand-ins for @fr-private/payload-plugin-visual-editing, which was
// removed by create-ideal-cms. The overlay is gone; components that opt into
// it keep rendering normally.

type ProviderProps = {
  available?: boolean;
  framedOnly?: boolean;
  adminOrigin?: string;
  adminBasePath?: string;
  children: ReactNode;
};

export const VisualEditing = {
  Provider: ({ children }: ProviderProps): ReactNode => children,
  Overlay: ({ children }: { locale?: string; children: ReactNode }): ReactNode => children,
  Toggle: (): ReactNode => null,
};

export const withVisualEditingPath = (_value: unknown): Record<string, string> => ({});
`;

/** Repo-relative path -> replacement contents. */
export const PRIVATE_PLUGIN_STUBS: Record<string, string> = {
  "apps/cms/src/lib/plugins/private.ts": PRIVATE_PLUGINS_STUB,
  "apps/cms/src/lib/plugins/visual-editing/client.ts": VISUAL_EDITING_CLIENT_STUB,
};

// Files where the private-scope references are whole lines that can simply be
// dropped, rather than code needing a rewrite.
export const LINE_STRIP_FILES: { path: string; patterns: string[] }[] = [
  // Payload's generated import map: one `import` line plus one map entry per
  // registered component.
  { path: "apps/cms/src/app/(payload)/admin/importMap.js", patterns: [STRIPPED_SCOPE] },
  // The plugin list in the app's agent guide.
  { path: "apps/cms/CLAUDE.md", patterns: [STRIPPED_SCOPE] },
  // The source repo's `.npmrc` points the private scope at npm and reads a CI
  // token: `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`. Left in place that
  // sends an empty token on EVERY registry request, so install fails for anyone
  // without `NPM_TOKEN` set — the private deps being gone doesn't save it.
  { path: ".npmrc", patterns: [STRIPPED_SCOPE, "_authToken"] },
];
