import { VisualEditing } from "@focus-reactive/payload-plugin-visual-editing/client";
import { draftMode } from "next/headers";
import React from "react";
import { AnalyticsProviderClient } from "./AnalyticsProviderClient";
import { RefreshOnSave } from "./RefreshOnSave";
import "./styles.css";

export const metadata = {
  description: "A blank template using Payload in a Next.js app.",
  title: "Payload Blank Template",
};

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!;
  const { isEnabled: draft } = await draftMode();

  return (
    <html lang="en">
      <body>
        <AnalyticsProviderClient measurementId={measurementId}>
          {/* Click-to-edit in Live Preview: draft mode only, inside the admin's preview iframe. */}
          <VisualEditing.Provider
            adminBasePath="/admin"
            available={draft}
            framedOnly
            instantPreview
          >
            {draft && <RefreshOnSave />}
            <VisualEditing.Toggle />
            <main>{children}</main>
          </VisualEditing.Provider>
        </AnalyticsProviderClient>
      </body>
    </html>
  );
}
