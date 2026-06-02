import type { ReactElement } from "react";

export type TrackOn = "click" | "submit" | "view" | "hover";

export interface TrackProps {
  on: TrackOn;
  event: string;
  payload?: Record<string, unknown>;
  children: ReactElement;
}

export * from "./config";
export * from "./events";
export * from "./leadActions";
export * from "./provider";
export * from "./query";
