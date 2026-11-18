"use client";

import { useId, useRef } from "react";

import { useCollapsedRows } from "../hooks/useCollapsedRows.js";
import { useConfinedToEditor } from "../hooks/useConfinedToEditor.js";
import { useCrumbLevels } from "../hooks/useCrumbLevels.js";
import { useLabelClicksInPanels } from "../hooks/useLabelClicksInPanels.js";
import { useOpenFieldFromPreview } from "../hooks/useOpenFieldFromPreview.js";
import { useOwnFormMarker } from "../hooks/useOwnFormMarker.js";
import { usePanelStack } from "../hooks/usePanelStack.js";
import { useRowChainResolver } from "../hooks/useRowChainResolver.js";
import { useRowHeaderClicks } from "../hooks/useRowHeaderClicks.js";
import { useTranslate } from "../hooks/useTranslate.js";
import { STYLE_HREF } from "../lib/constants.js";
import type { DefaultMode } from "../lib/headerClick.js";
import { STACKED_EDITING_CSS } from "../styles/index.js";
import { Panel } from "./Panel.js";
import { PanelStackContext } from "./PanelStackContext.js";
import type { PanelStackContextValue } from "./PanelStackContext.js";

export const StackedEditing = ({ defaultMode = "panel" }: { defaultMode?: DefaultMode }) => {
  const ownerId = useId().replaceAll(/[^a-zA-Z0-9]/gu, "");
  const markerRef = useRef<HTMLSpanElement>(null);
  const translate = useTranslate();

  const collapsedRows = useCollapsedRows(defaultMode === "panel");
  const panels = usePanelStack({
    resolve: useRowChainResolver(),
    onRowOpened: collapsedRows.forgetEditorExpansion,
  });

  useOwnFormMarker(markerRef, ownerId, defaultMode);
  useRowHeaderClicks({
    ownerId,
    mode: defaultMode,
    openRow: panels.openRow,
    onInlineToggle: collapsedRows.rememberEditorToggle,
  });
  useLabelClicksInPanels(ownerId);
  useOpenFieldFromPreview({ ownerId, openRow: panels.openRow, closeAll: panels.closeAll });

  const { crumbLevels, documentTitle } = useCrumbLevels(panels.levels, translate);
  const confined = useConfinedToEditor({ active: panels.levels.length > 0, markerRef });

  const panelStack: PanelStackContextValue = {
    confined,
    crumbLevels,
    documentTitle,
    keepPanels: panels.keepPanels,
    levels: panels.levels,
    mode: defaultMode,
    ownerId,
    translate,
  };

  return (
    <>
      <span hidden ref={markerRef} />
      <style href={STYLE_HREF} precedence="default">
        {STACKED_EDITING_CSS}
      </style>
      {panels.levels.length > 0 ? (
        <PanelStackContext value={panelStack}>
          <Panel depth={0} />
        </PanelStackContext>
      ) : null}
    </>
  );
};
