"use client";

import type { LucideIcon } from "lucide-react";
import { useLeadActionRegistry } from "../contexts/LeadActionRegistryContext";

export function useGetLeadActionIcon(): (type: string) => LucideIcon {
  const { resolveIcon } = useLeadActionRegistry();

  return resolveIcon;
}
