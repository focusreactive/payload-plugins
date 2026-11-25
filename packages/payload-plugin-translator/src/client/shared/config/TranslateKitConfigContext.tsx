"use client";

import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";

import type { TranslateKitConfig } from "../../../types/wire/TranslateKitConfig.js";

export class TranslateKitConfigMissingError extends Error {
  constructor() {
    super(
      "useTranslateKitConfig() was called outside TranslateKitConfigProvider: render the component under the translator's admin provider."
    );
    this.name = "TranslateKitConfigMissingError";
  }
}

const TranslateKitConfigContext = createContext<TranslateKitConfig | null>(null);

export type TranslateKitConfigProviderProps = PropsWithChildren<{ config: TranslateKitConfig }>;

export function TranslateKitConfigProvider({ config, children }: TranslateKitConfigProviderProps) {
  return (
    <TranslateKitConfigContext.Provider value={config}>
      {children}
    </TranslateKitConfigContext.Provider>
  );
}

export function useTranslateKitConfig(): TranslateKitConfig {
  const config = useContext(TranslateKitConfigContext);
  if (config === null) throw new TranslateKitConfigMissingError();
  return config;
}
