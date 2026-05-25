"use client";

import { createContext, useContext } from "react";
import type { ClientBlock } from "payload";

const BlocksConfigContext = createContext<ClientBlock[] | null>(null);

export const BlocksConfigProvider = BlocksConfigContext.Provider;

export function useBlocksConfig(): ClientBlock[] | null {
  return useContext(BlocksConfigContext);
}
