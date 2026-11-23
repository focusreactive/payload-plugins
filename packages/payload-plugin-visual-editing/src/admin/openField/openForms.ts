import type { FormState } from "payload";

import { createContext } from "react";

import type { VeDocument, VeOpenFieldMessage } from "../../shared/protocol.js";

import { documentAddressOf } from "../../shared/veDocument.js";
import { formPathOfKey } from "./formPathOfKey.js";

export type OpenForm = { document: VeDocument; readFormState: () => FormState };

export type AnnounceOpenForm = (form: OpenForm) => () => void;

const ignoreOpenForm: AnnounceOpenForm = () => () => undefined;

export const OpenFormsContext = createContext<AnnounceOpenForm>(ignoreOpenForm);

export const OPEN_FORM_BUDGET_MS = 15_000;

const nothingToStop = (): void => undefined;

export type OpenForms = {
  announce: AnnounceOpenForm;
  forms: ReadonlySet<OpenForm>;
  whenOpen: (document: VeDocument, budgetMs?: number) => Promise<boolean>;
};

export function createOpenForms(): OpenForms {
  const forms = new Set<OpenForm>();
  const watchers = new Set<() => void>();

  const isOpen = (document: VeDocument): boolean => {
    const documentAddress = documentAddressOf(document);
    return [...forms].some((form) => documentAddressOf(form.document) === documentAddress);
  };

  const announce: AnnounceOpenForm = (form) => {
    forms.add(form);
    for (const watch of watchers) watch();
    return () => {
      forms.delete(form);
    };
  };

  const whenOpen: OpenForms["whenOpen"] = (document, budgetMs = OPEN_FORM_BUDGET_MS) => {
    let stopWaiting = nothingToStop;
    const opened = new Promise<boolean>((resolve) => {
      const watch = () => {
        if (isOpen(document)) resolve(true);
      };
      const budget = setTimeout(resolve, budgetMs, false);
      stopWaiting = () => {
        clearTimeout(budget);
        watchers.delete(watch);
      };
      watchers.add(watch);
      watch();
    });
    return opened.finally(stopWaiting);
  };

  return { announce, forms, whenOpen };
}

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
