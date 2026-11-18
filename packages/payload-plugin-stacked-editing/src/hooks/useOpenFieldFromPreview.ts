"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { useEffect } from "react";

import { focusFieldInTopPanel } from "../lib/focusField.js";
import {
  OPEN_FIELD_EVENT,
  isForDocument,
  rowDepthOf,
  rowPathCandidates,
} from "../lib/openField.js";
import { useLatest } from "./useLatest.js";

export const useOpenFieldFromPreview = ({
  ownerId,
  openRow,
  closeAll,
}: {
  ownerId: string;
  openRow: (rowPath: string) => boolean;
  closeAll: () => void;
}) => {
  const { collectionSlug, globalSlug, id } = useDocumentInfo();
  const latest = useLatest({ document: { collectionSlug, globalSlug, id }, openRow, closeAll });

  useEffect(() => {
    let cancelFocus: (() => void) | undefined;
    const onOpenField = (event: Event) => {
      const { detail } = event as CustomEvent<Record<string, string> | null>;
      if (!isForDocument(detail, latest.current.document)) {
        return;
      }
      const rowPath = rowPathCandidates(detail.path).find((candidate) =>
        latest.current.openRow(candidate)
      );
      if (!rowPath) {
        latest.current.closeAll();
        return;
      }
      event.preventDefault();
      cancelFocus?.();
      cancelFocus = focusFieldInTopPanel({
        depth: rowDepthOf(rowPath),
        ownerId,
        path: detail.path,
      });
    };
    window.addEventListener(OPEN_FIELD_EVENT, onOpenField);
    return () => {
      cancelFocus?.();
      window.removeEventListener(OPEN_FIELD_EVENT, onOpenField);
    };
  }, [latest, ownerId]);
};
