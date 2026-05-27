import type { LucideIcon } from "lucide-react";

export type LeadActionType = string;

export interface LeadActionRegistryEntry {
  icon: LucideIcon;
  label: string;
}

export type LeadActionRegistry = Record<LeadActionType, LeadActionRegistryEntry>;

export interface LeadActionsPluginConfig {
  types?: LeadActionType[];
  adminRegistry?: string;
}
