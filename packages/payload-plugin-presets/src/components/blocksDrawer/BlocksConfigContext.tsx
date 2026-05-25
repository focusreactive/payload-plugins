"use client";

import type { ClientBlock } from "payload";
import { createContext, useContext } from "react";

const BlocksConfigContext = createContext<ClientBlock[] | null>(null);

export const BlocksConfigProvider = BlocksConfigContext.Provider;

export function useBlocksConfig(): ClientBlock[] | null {
  return useContext(BlocksConfigContext);
}
