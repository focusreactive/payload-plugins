"use client";

import type React from "react";

import { VisualEditing } from "@focus-reactive/payload-plugin-visual-editing/client";

import { useCoalescedRouterRefresh } from "@/components/LivePreviewListener/useCoalescedRouterRefresh";

const loadRichTextEditor = () => import("@focus-reactive/payload-plugin-visual-editing/rich-text");

export const VisualEditingSession: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const requestRefresh = useCoalescedRouterRefresh();

  return (
    <VisualEditing.Provider
      available
      instantPreview
      inlineEditing
      adminBasePath="/admin"
      onEdited={requestRefresh}
      richTextEditor={loadRichTextEditor}
    >
      {children}
    </VisualEditing.Provider>
  );
};
