"use client";

import { useForm, useFormFields } from "@payloadcms/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  keepFirstLevels,
  levelsWithUnchangedRows,
  openRowsSignature,
  rowsOf,
  withRowCollapsed,
} from "../lib/formRows.js";
import type { OpenRows } from "../lib/formRows.js";
import type { RowChain, RowLevel } from "../lib/resolveRowChain.js";
import { refreshDetachedEditors } from "../lib/staleEditors.js";
import { useLatest } from "./useLatest.js";

export type PanelStack = {
  readonly levels: RowLevel[];
  readonly openRow: (rowPath: string) => boolean;
  readonly keepPanels: (keep: number) => void;
  readonly closeAll: () => void;
};

export const usePanelStack = ({
  resolve,
  onRowOpened,
}: {
  resolve: (rowPath: string) => RowChain;
  onRowOpened: (rowId: string) => void;
}): PanelStack => {
  const [open, setOpen] = useState<OpenRows | null>(null);
  const { dispatchFields, getFields } = useForm();
  const signature = useFormFields(([fields]) => openRowsSignature(fields, open?.deepestRowPath));

  const levels = useMemo(() => {
    if (!open || signature === undefined) {
      return [];
    }
    return levelsWithUnchangedRows(resolve(open.deepestRowPath), open, getFields());
  }, [getFields, open, resolve, signature]);
  const levelsRef = useLatest(levels);

  useEffect(() => {
    const rowsChangedUnderOpenPanels = open !== null && levels.length < open.rowIdsAtOpen.length;
    if (rowsChangedUnderOpenPanels) {
      setOpen(keepFirstLevels(levels, open, levels.length));
    }
  }, [levels, open]);

  const keepPanels = useCallback(
    (keep: number) => {
      const firstClosed = levelsRef.current[keep];
      if (!firstClosed) {
        return;
      }
      refreshDetachedEditors({ dispatchFields, getFields, rowPath: firstClosed.rowPath });
      setOpen((previous) => (previous ? keepFirstLevels(levelsRef.current, previous, keep) : null));
    },
    [dispatchFields, getFields, levelsRef]
  );

  const collapseInlineRow = useCallback(
    (fieldPath: string, rowId: string) => {
      const rows = rowsOf(getFields(), fieldPath) ?? [];
      dispatchFields({
        type: "SET_ROW_COLLAPSED",
        path: fieldPath,
        updatedRows: withRowCollapsed(rows, rowId),
      } as Parameters<typeof dispatchFields>[0]);
    },
    [dispatchFields, getFields]
  );

  const openRow = useCallback(
    (rowPath: string): boolean => {
      const chain = resolve(rowPath);
      if (!chain.complete) {
        return false;
      }
      const fields = getFields();
      const rows = chain.levels.map((level) => rowsOf(fields, level.fieldPath)?.[level.rowIndex]);
      if (rows.some((row) => !row?.id)) {
        return false;
      }
      for (const [index, level] of chain.levels.entries()) {
        const row = rows[index];
        if (!row?.id) {
          continue;
        }
        onRowOpened(row.id);
        if (!row.collapsed) {
          collapseInlineRow(level.fieldPath, row.id);
        }
      }
      setOpen({ deepestRowPath: rowPath, rowIdsAtOpen: rows.map((row) => row?.id ?? "") });
      return true;
    },
    [collapseInlineRow, getFields, onRowOpened, resolve]
  );

  const closeAll = useCallback(() => setOpen(null), []);

  return { levels, openRow, keepPanels, closeAll };
};
