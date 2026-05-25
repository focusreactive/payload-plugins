'use client'

import { createContext, useContext, useMemo, type PropsWithChildren } from 'react'

type TranslateKitConfig = {
  basePath: string
}

const defaultConfig: TranslateKitConfig = {
  basePath: '/translate',
}

const TranslateKitConfigContext = createContext<TranslateKitConfig>(defaultConfig)

export type TranslateKitConfigProviderProps = PropsWithChildren<Partial<TranslateKitConfig>>

export function TranslateKitConfigProvider({
  basePath = defaultConfig.basePath,
  children,
}: TranslateKitConfigProviderProps) {
  const value = useMemo(() => ({ basePath }), [basePath])

  return <TranslateKitConfigContext.Provider value={value}>{children}</TranslateKitConfigContext.Provider>
}

export function useTranslateKitConfig(): TranslateKitConfig {
  return useContext(TranslateKitConfigContext)
}
