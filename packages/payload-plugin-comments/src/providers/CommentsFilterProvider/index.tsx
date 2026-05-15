"use client";

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { CommentsFilters } from "../../types/filters";

interface CommentsFilterContextProps {
  filters: CommentsFilters;
  isAnyFilterActive: boolean;
  setFilter: (key: keyof CommentsFilters, value: boolean) => void;
}

const CommentsFilterContext = createContext<CommentsFilterContextProps | null>(
  null
);

interface Props {
  children: ReactNode;
}

export function CommentsFilterProvider({ children }: Props) {
  const [filters, setFilters] = useState<CommentsFilters>({
    onlyMyThreads: true,
    showResolved: true,
  });

  const setFilter = (key: keyof CommentsFilters, value: boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const isAnyFilterActive = useMemo(
    () => filters.showResolved || filters.onlyMyThreads,
    [filters]
  );

  return (
    <CommentsFilterContext.Provider
      value={{ filters, isAnyFilterActive, setFilter }}
    >
      {children}
    </CommentsFilterContext.Provider>
  );
}

export function useCommentsFilter() {
  const context = useContext(CommentsFilterContext);

  if (!context)
    {throw new Error(
      "useCommentsFilter must be used within CommentsFilterProvider"
    );}

  return context;
}
