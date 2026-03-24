"use client";

import { useDrawerSlug, useModal } from "@payloadcms/ui";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { COMMENTS_DRAWER_BASE_SLUG } from "../../constants";

interface PendingField {
  path: string;
  label: string;
}

interface CommentsDrawerContextProps {
  slug: string;
  isOpen: boolean;
  scrollTargetPath: string | null;
  pendingField: PendingField | null;
  open: () => void;
  setScrollTargetPath: (path: string | null) => void;
  openForField: (path: string, label: string) => void;
  clearPendingField: () => void;
}

const CommentsDrawerContext = createContext<CommentsDrawerContextProps | null>(null);

interface Props {
  children: ReactNode;
}

export function CommentsDrawerProvider({ children }: Props) {
  const [scrollTargetPath, setScrollTargetPath] = useState<string | null>(null);
  const [pendingField, setPendingField] = useState<PendingField | null>(null);

  const slug = useDrawerSlug(COMMENTS_DRAWER_BASE_SLUG);
  const { openModal, modalState } = useModal();

  const isOpen = modalState[slug]?.isOpen ?? false;

  const open = () => {
    openModal(slug);
  };

  const openForField = (path: string, label: string) => {
    setScrollTargetPath(path);
    setPendingField({ path, label });
    openModal(slug);
  };

  const clearPendingField = () => setPendingField(null);

  useEffect(() => {
    if (!isOpen) {
      setPendingField(null);
    }
  }, [isOpen]);

  return (
    <CommentsDrawerContext.Provider
      value={{ slug, isOpen, scrollTargetPath, pendingField, open, setScrollTargetPath, openForField, clearPendingField }}>
      {children}
    </CommentsDrawerContext.Provider>
  );
}

export function useCommentsDrawer() {
  const context = useContext(CommentsDrawerContext);

  if (!context) throw new Error("useCommentsDrawer must be used within a CommentsProvider");

  return context;
}
