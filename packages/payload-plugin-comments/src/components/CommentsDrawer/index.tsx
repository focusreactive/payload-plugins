"use client";

import { Drawer, useModal } from "@payloadcms/ui";
import { createPortal } from "react-dom";

import { cn } from "../../utils/general/cn";
import { CommentsPanel } from "../CommentsPanel";
import { Header } from "./components/Header";

interface Props {
  slug: string;
}

export function CommentsDrawer({ slug }: Props) {
  const { modalState, closeModal, containerRef } = useModal();
  const isOpen = !!modalState[slug]?.isOpen;

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
        className={cn("comments-drawer max-w-150 w-full m-0 ml-auto relative")}
        slug={slug}
        Header={<Header slug={slug} />}
      >
        <CommentsPanel className="pb-5" />
      </Drawer>
    </>
  );
}
