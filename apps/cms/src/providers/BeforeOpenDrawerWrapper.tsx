"use client";

import { BeforeOpenDrawerProvider } from "@focus-reactive/payload-plugin-presets/client";
import React from "react";
export default function BeforeOpenDrawerWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BeforeOpenDrawerProvider beforeOpenDrawer={async () => true}>
      {children}
    </BeforeOpenDrawerProvider>
  );
}
