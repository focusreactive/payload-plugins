import { getPayload } from 'payload';
import type { Payload } from 'payload';

import { getPayloadConfig } from "../../config";

export async function extractPayload(payload?: Payload): Promise<Payload> {
  return payload ?? (await getPayload({ config: getPayloadConfig() }));
}
