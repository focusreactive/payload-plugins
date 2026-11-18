"use client";

import { useForm, useFormFields } from "@payloadcms/ui";
import { useCallback, useEffect, useRef } from "react";

import { rowsSignature, rowsToCollapse } from "../lib/collapseRows.js";
import type { CollapseMemory } from "../lib/collapseRows.js";

const COLLAPSE_RECHECK_FRAMES = 10;
const EDITOR_TOGGLE_MEMORY_MS = 1500;

export type CollapsedRows = {
  readonly rememberEditorToggle: (fieldPath: string) => void;
  readonly forgetEditorExpansion: (rowId: string) => void;
};

export const useCollapsedRows = (enabled: boolean): CollapsedRows => {
  const { dispatchFields, getFields } = useForm();
  const rows = useFormFields(([fields]) => (enabled ? rowsSignature(fields) : ""));
  const memory = useRef<CollapseMemory>({
    fieldsJustToggledByEditor: new Set<string>(),
    rowsExpandedByEditor: new Set<string>(),
  });

  useEffect(() => {
    if (!enabled || !rows) {
      return;
    }
    const collapseRowsNow = () => {
      for (const { path, updatedRows } of rowsToCollapse(getFields(), memory.current)) {
        dispatchFields({ type: "SET_ROW_COLLAPSED", path, updatedRows } as Parameters<
          typeof dispatchFields
        >[0]);
      }
    };
    // Payload's initial REPLACE_STATE can land on an identical signature, so re-check for a few frames.
    let frame = 0;
    let framesLeft = COLLAPSE_RECHECK_FRAMES;
    const collapseOnEachFrame = () => {
      collapseRowsNow();
      framesLeft -= 1;
      if (framesLeft > 0) {
        frame = requestAnimationFrame(collapseOnEachFrame);
      }
    };
    collapseOnEachFrame();
    return () => cancelAnimationFrame(frame);
  }, [dispatchFields, enabled, getFields, rows]);

  const rememberEditorToggle = useCallback((fieldPath: string) => {
    const { fieldsJustToggledByEditor } = memory.current;
    fieldsJustToggledByEditor.add(fieldPath);
    setTimeout(() => fieldsJustToggledByEditor.delete(fieldPath), EDITOR_TOGGLE_MEMORY_MS);
  }, []);

  const forgetEditorExpansion = useCallback((rowId: string) => {
    memory.current.rowsExpandedByEditor.delete(rowId);
  }, []);

  return { rememberEditorToggle, forgetEditorExpansion };
};
