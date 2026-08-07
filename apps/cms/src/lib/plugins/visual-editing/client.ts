// Client-side surface of the visual-editing plugin, re-exported through the
// app so frontend components never import `@fr-private/*` directly.
//
// The package is published to a private npm scope, so `create-ideal-cms`
// replaces THIS FILE with inert no-op equivalents when scaffolding a project
// (see packages/create-ideal-cms/src/stubs.ts). Keep the exported surface
// minimal and keep the stub in sync with it.
export {
  VisualEditing,
  withVisualEditingPath,
} from "@fr-private/payload-plugin-visual-editing/client";
