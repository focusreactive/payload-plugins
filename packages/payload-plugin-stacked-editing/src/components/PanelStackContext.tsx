"use client";

import { createContext, use } from "react";

import type { CrumbLevel } from "../lib/breadcrumbs.js";
import type { DefaultMode } from "../lib/headerClick.js";
import type { Translate } from "../lib/labels.js";
import type { RowLevel } from "../lib/resolveRowChain.js";

export type PanelStackContextValue = {
  readonly levels: readonly RowLevel[];
  readonly crumbLevels: readonly CrumbLevel[];
  readonly documentTitle: string;
  readonly mode: DefaultMode;
  readonly ownerId: string;
  readonly confined: boolean;
  readonly translate: Translate;
  readonly keepPanels: (keep: number) => void;
};

export const PanelStackContext = createContext<PanelStackContextValue | null>(null);

export const usePanelStackContext = (): PanelStackContextValue => {
  const value = use(PanelStackContext);
  if (!value) {
    throw new Error("Panel must be rendered inside StackedEditing");
  }
  return value;
};
