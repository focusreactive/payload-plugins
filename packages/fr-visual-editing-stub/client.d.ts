import type { FC, ReactNode } from "react";

type ProviderProps = { available?: boolean; adminBasePath?: string; children?: ReactNode };
type OverlayProps = { locale?: string; children?: ReactNode };

export declare const VisualEditing: {
  Provider: FC<ProviderProps>;
  Toggle: FC;
  Overlay: FC<OverlayProps>;
};

export declare const withVisualEditingPath: (resource?: unknown) => Record<string, never>;
