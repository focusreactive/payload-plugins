import React from "react";

// Untitled UI's stylesheet loads @tailwindcss/typography, whose ul rules carry the same
// specificity as our own prose ones. Imported last it won, which left rich-text bullets with a
// native disc marker and no room for the check icon, so the icon painted over the first word.
// Their theme is the base; ours overrides it.
import "@/styles/globals.css";
import "./styles.css";
import "@/components/styles/global.css";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
