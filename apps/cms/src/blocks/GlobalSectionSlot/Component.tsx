import type { GlobalSectionSlotBlock } from "@/payload-types";

import { GlobalBlockRenderer } from "./GlobalBlockRenderer";

export const GlobalSectionSlotBlockComponent = ({ reference }: GlobalSectionSlotBlock) => {
  const referenceId = typeof reference === "object" && reference ? reference.id : reference;
  if (referenceId == null) return null;

  return <GlobalBlockRenderer referenceId={referenceId} />;
};
