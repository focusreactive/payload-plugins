import type { Payload, TypedUser } from "payload";

export interface ServiceContext {
  payload: Payload;
  user: TypedUser;
  headers: Headers;
}

export interface BaseDocument {
  id: string | number;
  [key: string]: unknown;
}
