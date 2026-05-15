import type { SanitizedCollectionConfig, SanitizedGlobalConfig } from "payload";

export type EntityConfig = SanitizedCollectionConfig | SanitizedGlobalConfig;

export type EntityLabel = string | Record<string, string>;

export type EntityLabelsMap = Record<string, EntityLabel>;

export type FieldLabelSegment =
  | {
      type: "field";
      label: string;
    }
  | {
      type: "row";
      id: string;
      position: number;
    };

export type GlobalFieldLabelRegistry = Record<
  string,
  Record<number, Record<string, FieldLabelSegment[]>>
>;

export type Mode = "document" | "global-document" | "global";
