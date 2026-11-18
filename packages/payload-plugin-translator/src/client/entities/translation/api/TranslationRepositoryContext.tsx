"use client";

import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";

import type { TranslationRepository } from "../model/TranslationRepository.js";

export class TranslationRepositoryMissingError extends Error {
  constructor() {
    super(
      "useTranslationRepository() was called outside TranslationRepositoryProvider: render the component under the translator's admin provider."
    );
    this.name = "TranslationRepositoryMissingError";
  }
}

const TranslationRepositoryContext = createContext<TranslationRepository | null>(null);

export type TranslationRepositoryProviderProps = PropsWithChildren<{
  repository: TranslationRepository;
}>;

export function TranslationRepositoryProvider({
  repository,
  children,
}: TranslationRepositoryProviderProps) {
  return (
    <TranslationRepositoryContext.Provider value={repository}>
      {children}
    </TranslationRepositoryContext.Provider>
  );
}

export function useTranslationRepository(): TranslationRepository {
  const repository = useContext(TranslationRepositoryContext);
  if (repository === null) throw new TranslationRepositoryMissingError();
  return repository;
}
