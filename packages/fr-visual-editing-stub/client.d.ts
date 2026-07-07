import type { FC, ReactNode } from "react";

// Permissive props: the stub ignores everything the real package accepts
// (available, adminBasePath, framedOnly, locale, …), so accept any prop.
type AnyProps = { children?: ReactNode; [key: string]: unknown };

export declare const VisualEditing: {
  Provider: FC<AnyProps>;
  Toggle: FC<AnyProps>;
  Overlay: FC<AnyProps>;
};

export declare const withVisualEditingPath: (resource?: unknown) => Record<string, never>;
