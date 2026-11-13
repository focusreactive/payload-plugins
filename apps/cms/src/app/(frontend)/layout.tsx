import React from "react";

// The public site renders with its own stylesheets, served from /assets/css and linked per page
// by `SitePage`, so the app's Tailwind build is not loaded on the frontend.

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
