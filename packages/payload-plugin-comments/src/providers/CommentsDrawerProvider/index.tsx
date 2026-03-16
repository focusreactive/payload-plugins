"use client";

import { useDrawerSlug, useModal } from "@payloadcms/ui";
import { createContext, type ReactNode, useContext, useState } from "react";
import { COMMENTS_DRAWER_BASE_SLUG } from "../../constants";
import { useComments } from "../CommentsProvider";

interface CommentsDrawerContextProps {
  slug: string;
  scrollTargetPath: string | null;
  open: () => void;
  setScrollTargetPath: (path: string | null) => void;
}

const CommentsDrawerContext = createContext<CommentsDrawerContextProps | null>(null);

interface Props {
  children: ReactNode;
}

export function CommentsDrawerProvider({ children }: Props) {
  const [scrollTargetPath, setScrollTargetPath] = useState<string | null>(null);
  const slug = useDrawerSlug(COMMENTS_DRAWER_BASE_SLUG);
  const { openModal } = useModal();
  const { syncComments } = useComments();

  const open = () => {
    openModal(slug);

    void syncComments();
  };

  return (
    <CommentsDrawerContext.Provider value={{ slug, scrollTargetPath, open, setScrollTargetPath }}>
      {children}
    </CommentsDrawerContext.Provider>
  );
}

export function useCommentsDrawer() {
  const context = useContext(CommentsDrawerContext);

  if (!context) throw new Error("useCommentsDrawer must be used within a CommentsProvider");

  return context;
}
