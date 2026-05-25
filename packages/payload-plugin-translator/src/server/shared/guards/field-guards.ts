import type { Field, RichTextField, TabsField, TextareaField, TextField } from 'payload'

import { isObject } from '../utils'

/** Translatable field types that contain text content */
export type TranslatableField = RichTextField | TextareaField | TextField

/**
 * Type guard: Checks if a field contains translatable text content (text, textarea, richText).
 */
export function isTranslatableField(field: Field): field is TranslatableField {
  return field.type === 'text' || field.type === 'textarea' || field.type === 'richText'
}

/**
 * Type guard: Checks if a field has the `localized` property set to true.
 */
export function isLocalizedField(field: Field): field is Field & { localized: true } {
  return 'localized' in field && field.localized === true
}

/**
 * Type guard: Checks if a field is a relationship or upload field (should be skipped).
 */
export function isRelationshipField(field: Field): field is Field & { relationTo: unknown } {
  return 'relationTo' in field && field.relationTo !== undefined
}

/**
 * Type guard: Checks if a field is a tabs field.
 */
export function isTabsField(field: Field): field is TabsField {
  return field.type === 'tabs'
}

/**
 * Type guard: Checks if value is a block item (has blockType property).
 */
export function isBlockItem(value: unknown): value is Record<string, unknown> & { blockType: string } {
  return isObject(value) && 'blockType' in value && typeof value.blockType === 'string'
}

/**
 * Type guard: Checks if value has a fields array property.
 * Works with Field, Tab, or any object with fields.
 */
export function hasFields(value: unknown): value is { fields: Field[] } {
  return isObject(value) && 'fields' in value && Array.isArray(value.fields)
}
