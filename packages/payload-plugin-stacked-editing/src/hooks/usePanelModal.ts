"use client";

import { useModal } from "@payloadcms/ui";
import { useEffect, useRef } from "react";

import { useLatest } from "./useLatest.js";

export const usePanelModal = (slug: string, onClosedByDrawer: () => void) => {
  const { closeModal, modalState, openModal } = useModal();
  const isOpen = Boolean(modalState[slug]?.isOpen);
  const hasOpened = useRef(false);
  const onClosedRef = useLatest(onClosedByDrawer);

  // One frame later than the parent, so Escape (closes the latest `openedOn`) closes the top panel.
  useEffect(() => {
    const frame = requestAnimationFrame(() => openModal(slug));
    return () => {
      cancelAnimationFrame(frame);
      closeModal(slug);
    };
  }, [closeModal, openModal, slug]);

  useEffect(() => {
    if (isOpen) {
      hasOpened.current = true;
      return;
    }
    if (hasOpened.current) {
      hasOpened.current = false;
      onClosedRef.current();
    }
  }, [isOpen, onClosedRef]);

  return { close: () => closeModal(slug) };
};
