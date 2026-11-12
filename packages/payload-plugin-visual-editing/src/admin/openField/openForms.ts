import type { FormState } from "payload";

import { createContext } from "react";

import type { VeDocument, VeOpenFieldMessage } from "../../shared/protocol.js";

import { documentAddressOf } from "../../shared/veDocument.js";
import { formPathOfKey } from "./formPathOfKey.js";

export type OpenForm = { document: VeDocument; readFormState: () => FormState };

export type AnnounceOpenForm = (form: OpenForm) => () => void;

const ignoreOpenForm: AnnounceOpenForm = () => () => undefined;

export const OpenFormsContext = createContext<AnnounceOpenForm>(ignoreOpenForm);

export function currentFormPathOf(
  message: VeOpenFieldMessage,
  openForms: ReadonlySet<OpenForm>
): string {
  const { key, path } = message;
  if (key === undefined) return path;

  const documentAddress = documentAddressOf(message);
  for (const { document, readFormState } of openForms) {
    if (documentAddressOf(document) !== documentAddress) continue;
    return formPathOfKey({ key, path }, readFormState());
  }
  return path;
}
