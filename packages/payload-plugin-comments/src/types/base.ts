import type { Payload } from "payload";

export interface BaseServiceOptions {
  payload?: Payload;
  locale?: string | null;
}

export interface BaseDocument {
  id: string | number;
  [key: string]: unknown;
}
