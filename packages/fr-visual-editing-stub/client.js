// No-op renderers: wrappers pass children through, the toggle renders nothing.
// Kept free of "use client" and hooks so it is safe to call/render from both
// server and client components (withVisualEditingPath is used in RSCs).
const passthrough = ({ children }) => children ?? null;

export const VisualEditing = {
  Provider: passthrough,
  Toggle: () => null,
  Overlay: passthrough,
};

export const withVisualEditingPath = () => ({});
