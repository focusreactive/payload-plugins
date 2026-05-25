import { useConfig } from '@payloadcms/ui'
import { useMemo } from 'react'

export function useLocaleOptions(): Array<{ value: string; label: string }> {
  const appConfig = useConfig()

  return useMemo(
    () =>
      appConfig.config.localization
        ? appConfig.config.localization.locales.map((l) => ({ value: l.code, label: l.code }))
        : [],
    [appConfig.config.localization],
  )
}
