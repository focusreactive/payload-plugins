import React from "react";

import "./styles.css";
import "@/components/styles/global.css";
import "@/styles/globals.css";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
