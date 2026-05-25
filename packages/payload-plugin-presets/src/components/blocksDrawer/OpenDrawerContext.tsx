"use client";

import React, { createContext, useContext } from "react";

type OpenDrawerFn = (insertIndex: number) => void;

const OpenDrawerContext = createContext<OpenDrawerFn | null>(null);

export const OpenDrawerProvider: React.FC<{
  openDrawer: OpenDrawerFn;
  children: React.ReactNode;
}> = ({ openDrawer, children }) => {
  return (
    <OpenDrawerContext.Provider value={openDrawer}>
      {children}
    </OpenDrawerContext.Provider>
  );
};

export function useOpenDrawer(): OpenDrawerFn | null {
  return useContext(OpenDrawerContext);
}
