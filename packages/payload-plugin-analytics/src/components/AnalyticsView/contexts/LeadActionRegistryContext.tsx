"use client";

import type { LucideIcon } from "lucide-react";
import { Zap } from "lucide-react";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { BUILT_IN_LEAD_ACTION_REGISTRY } from "../../../utils/leadActions/builtInRegistry";
import { humanizeType } from "../../../utils/leadActions/humanizeType";
import type { LeadActionRegistry, LeadActionRegistryEntry } from "../../../types/leadActions";

export interface LeadActionRegistryApi {
  resolveLabel: (type: string) => string;
  resolveIcon: (type: string) => LucideIcon;
  resolveEntry: (type: string) => LeadActionRegistryEntry;
}

const FALLBACK_ICON: LucideIcon = Zap;

const LeadActionRegistryContext = createContext<LeadActionRegistryApi | null>(null);

export interface LeadActionRegistryProviderProps {
  registry: LeadActionRegistry;
  children: ReactNode;
}

export function LeadActionRegistryProvider({
  registry,
  children,
}: LeadActionRegistryProviderProps) {
  const merged = useMemo<LeadActionRegistry>(
    () => ({ ...BUILT_IN_LEAD_ACTION_REGISTRY, ...registry }),
    [registry]
  );

  const api = useMemo<LeadActionRegistryApi>(
    () => ({
      resolveLabel: (type) => merged[type]?.label ?? humanizeType(type),
      resolveIcon: (type) => merged[type]?.icon ?? FALLBACK_ICON,
      resolveEntry: (type) => merged[type] ?? { icon: FALLBACK_ICON, label: humanizeType(type) },
    }),
    [merged]
  );

  return (
    <LeadActionRegistryContext.Provider value={api}>{children}</LeadActionRegistryContext.Provider>
  );
}

export function useLeadActionRegistry(): LeadActionRegistryApi {
  const ctx = useContext(LeadActionRegistryContext);

  if (ctx) return ctx;

  return {
    resolveLabel: (type) => BUILT_IN_LEAD_ACTION_REGISTRY[type]?.label ?? humanizeType(type),
    resolveIcon: (type) => BUILT_IN_LEAD_ACTION_REGISTRY[type]?.icon ?? FALLBACK_ICON,
    resolveEntry: (type) =>
      BUILT_IN_LEAD_ACTION_REGISTRY[type] ?? { icon: FALLBACK_ICON, label: humanizeType(type) },
  };
}

export function createLeadActionRegistry(registry: LeadActionRegistry) {
  function BoundLeadActionRegistryProvider({ children }: { children: ReactNode }) {
    return <LeadActionRegistryProvider registry={registry}>{children}</LeadActionRegistryProvider>;
  }

  return BoundLeadActionRegistryProvider;
}
