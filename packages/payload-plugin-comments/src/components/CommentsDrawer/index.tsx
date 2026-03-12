"use client";

import { CommentsPanel } from "../CommentsPanel";
import { Header } from "./components/Header";
import { cn } from "../../utils/general/cn";
import { Drawer } from "@payloadcms/ui";

interface Props {
  slug: string;
}

export function CommentsDrawer({ slug }: Props) {
  return (
    <Drawer
      className={cn("comments-drawer max-w-150 w-full m-0 ml-auto relative")}
      slug={slug}
      Header={<Header slug={slug} />}>
      <CommentsPanel className="pb-5" />
    </Drawer>
  );
}
