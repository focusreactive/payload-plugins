'use client'

import { SaveAsPresetButton } from './SaveAsPresetButton.js'

export function PresetActions() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <SaveAsPresetButton />
      {/* <ApplyPresetButton /> */}
    </div>
  )
}
