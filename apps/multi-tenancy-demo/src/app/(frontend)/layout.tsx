import { VisualEditing } from "@fr-private/payload-plugin-visual-editing/client";
import { draftMode } from "next/headers";
import React from "react";
import "./styles.css";

export const metadata = {
  description: "A minimal demo of @payloadcms/plugin-multi-tenant.",
  title: "Multi-Tenancy Demo",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The overlay is only available in draft mode; a user-level toggle then gates
  // whether the click-to-edit badges actually render. `framedOnly` keeps it to
  // the admin Live Preview iframe.
  const { isEnabled } = await draftMode();

  return (
    <html lang="en">
      <body>
        <VisualEditing.Provider adminBasePath="/admin" available={isEnabled} framedOnly>
          <VisualEditing.Toggle />
          <VisualEditing.Overlay>{children}</VisualEditing.Overlay>
        </VisualEditing.Provider>
      </body>
    </html>
  );
}
