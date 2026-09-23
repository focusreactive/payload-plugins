import type { Field } from "payload";

/**
 * The firm's own list of nine markets. Shared verbatim by every collection
 * that needs to tag content or people by market, so the option set can never
 * drift between collections.
 */
export const MARKET_OPTIONS = [
  { label: "UK/Europe", value: "uk-europe" },
  { label: "Canada", value: "canada" },
  { label: "Greater China", value: "greater-china" },
  { label: "SE Asia", value: "se-asia" },
  { label: "USA", value: "usa" },
  { label: "Japan", value: "japan" },
  { label: "Korea", value: "korea" },
  { label: "Nordics", value: "nordics" },
  { label: "South America", value: "south-america" },
] as const;

/**
 * Not localized: which markets a document or person belongs to does not
 * change by language, so it must not be asked to pick a value per language.
 */
export const marketsField = (): Field => ({
  name: "markets",
  type: "select",
  admin: {
    description: {
      en: "The markets this applies to.",
      es: "Los mercados a los que aplica esto.",
    },
  },
  hasMany: true,
  label: {
    en: "Markets",
    es: "Mercados",
  },
  options: [...MARKET_OPTIONS],
});
