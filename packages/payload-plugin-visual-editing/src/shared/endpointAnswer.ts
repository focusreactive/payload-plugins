import type { SaveRefusal } from "./fieldEdit.js";

import { readSaveRefusal } from "./fieldEdit.js";

export type EndpointAnswer = { answer: unknown; refusal: SaveRefusal | null };

export const jsonOf = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const endpointAnswerOf = async (response: Response): Promise<EndpointAnswer> => {
  const answer = await jsonOf(response);
  return { answer, refusal: response.ok ? null : readSaveRefusal(answer) };
};
