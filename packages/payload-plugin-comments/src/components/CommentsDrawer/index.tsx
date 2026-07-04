"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { CommentsPanel } from "../CommentsPanel";
import { Header } from "./components/Header";
import { cn } from "../../utils/general/cn";
import { Drawer, useModal } from "@payloadcms/ui";
import { DELETE_MODAL_SLUG_PREFIX } from "../../constants";

interface Props {
  slug: string;
}

export function CommentsDrawer({ slug }: Props) {
  const { modalState, closeModal, containerRef, setBodyScrollLock } = useModal();
  const isOpen = !!modalState[slug]?.isOpen;

  const prevOpenDeleteSlugsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const openDeleteSlugs = new Set(
      Object.keys(modalState).filter(
        (key) => key.startsWith(DELETE_MODAL_SLUG_PREFIX) && modalState[key]?.isOpen
      )
    );

    const prevOpenDeleteSlugs = prevOpenDeleteSlugsRef.current;
    const aDeleteModalClosed = [...prevOpenDeleteSlugs].some((key) => !openDeleteSlugs.has(key));
    prevOpenDeleteSlugsRef.current = openDeleteSlugs;

    if (aDeleteModalClosed && isOpen) {
      const drawerEl = document.querySelector(`#${slug}`) as HTMLElement;

      if (drawerEl) {
        setBodyScrollLock(false, drawerEl);
        setBodyScrollLock(true, drawerEl);
      }
    }
  }, [modalState, isOpen, slug, setBodyScrollLock]);

  useEffect(() => {
    if (isOpen) return;

    const anyModalOpen = Object.keys(modalState).some((key) => modalState[key]?.isOpen);

    if (!anyModalOpen && document.body.style.overflow === "hidden") {
      document.body.style.overflow = "";
    }
  }, [isOpen, modalState]);

  return (
    <>
      {isOpen &&
        containerRef.current &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 z-29 cursor-pointer"
            onClick={() => closeModal(slug)}
          />,
          containerRef.current
        )}
      <Drawer
        className={cn("frcomments-drawer max-w-150 w-full m-0 ml-auto relative")}
        slug={slug}
        Header={<Header slug={slug} />}
      >
        <CommentsPanel className="pb-5" />
      </Drawer>
    </>
  );
}
