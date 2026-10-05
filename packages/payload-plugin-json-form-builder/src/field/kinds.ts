import type { NodeType } from "./typedJson.js";

// Keyed by kind, so a kind added to the vocabulary cannot be left out of the palette. `group` only
// sorts it; `glyph` is the tile it is drawn with.
type Kind = { draws: string; glyph: string; group: "Text" | "Values" | "Media" | "Structure" };

export const KINDS: Record<NodeType, Kind> = {
  text: { draws: "A line of text.", glyph: "T", group: "Text" },
  textarea: { draws: "Several lines of plain text.", glyph: "¶", group: "Text" },
  richText: { draws: "The editor the blocks use, stored as html.", glyph: "R", group: "Text" },
  number: { draws: "A number, with a min and a max.", glyph: "42", group: "Values" },
  date: { draws: "A date from the calendar.", glyph: "31", group: "Values" },
  checkbox: { draws: "True or false.", glyph: "✓", group: "Values" },
  select: { draws: "One of a list of options.", glyph: "▼", group: "Values" },
  upload: { draws: "A file from the Media collection.", glyph: "↑", group: "Media" },
  group: { draws: "Fields under a heading.", glyph: "{ }", group: "Structure" },
  collapsible: { draws: "The same, drawn as an accordion.", glyph: "Ξ", group: "Structure" },
  tabs: { draws: "A strip of tabs, holding tabs only.", glyph: "ΠΠ", group: "Structure" },
  tab: { draws: "One tab and the fields in it.", glyph: "Π", group: "Structure" },
  array: { draws: "A list of cards, all one shape.", glyph: "[ ]", group: "Structure" },
};

export const GROUPS: Kind["group"][] = ["Text", "Values", "Media", "Structure"];
