/** Generic media type for plugin compatibility */
export interface MediaData {
  id: number | string;
  url?: string | null;
  alt?: string | null;
}

/** Preset type used across the plugin */
export interface Preset {
  id: string;
  name: string;
  presetBlock?: { blockType: string; [key: string]: unknown }[];
  preview?: MediaData;
  [key: string]: unknown;
}
