'use client'

// Admin components
export { PresetAdminComponentPreview } from './components/PresetAdminComponentPreview.js'
export { PresetAdminComponentCell } from './components/PresetAdminComponentCell.js'

// Preset action buttons (presetActions folder)
export { PresetActions } from './components/presetActions/index.js'
export { PresetActionsField } from './components/presetActions/PresetActionsField.js'

// Custom BlocksField with presets integration (blocksDrawer folder)
export { BlocksFieldWithPresets } from './components/blocksDrawer/index.js'
export { BlockSelectorWithPresets } from './components/blocksDrawer/index.js'
export { BeforeOpenDrawerProvider, useBeforeOpenDrawer } from './components/blocksDrawer/index.js'
export type { BeforeOpenDrawerFn, BeforeOpenDrawerInfo } from './components/blocksDrawer/index.js'

// Shared components
export { EmptyPlaceholder, DefaultBlockImage } from './components/shared/index.js'
export type { Preset, MediaData } from './components/shared/index.js'

// Hook for accessing plugin config
export { usePresetsConfig } from './components/usePresetsConfig.js'

// Utilities
export { getParentPath, getPresetTypeFromPath } from './components/utils.js'
