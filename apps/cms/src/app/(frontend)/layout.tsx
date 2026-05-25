import React from "react";

import "./styles.css";
import "@repo/ui/styles/global.css";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
