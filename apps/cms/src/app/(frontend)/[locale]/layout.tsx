import type { Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { getMessages } from "next-intl/server";
import { draftMode } from "next/headers";
import React from "react";

import { VisualEditing } from "@focus-reactive/payload-plugin-visual-editing/client";

import { Providers } from "@/lib/context";
import { AnalyticsProviderClient } from "@/lib/plugins/analytics/AnalyticsProviderClient";
import type { Locale } from "@/lib/types";
import { LivePreviewListener } from "@/components/LivePreviewListener";
import { VisualEditingEditRouter } from "@/components/VisualEditingEditRouter";
import { VisualEditingSession } from "@/components/VisualEditingSession";

// Inter with the optical-size axis: `font-variation-settings: "opsz" 32` in
// styles.css pins it to the Display cut the design uses at every size.
const inter = Inter({
  axes: ["opsz"],
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-inter",
});

const ibmPlexMono = IBM_Plex_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: [{ color: "#000000" }],
  width: "device-width",
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  const { isEnabled: draft } = await draftMode();
  const messages = await getMessages();

  return (
    <html lang={locale} data-theme="light" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <head />
      <body>
        <AnalyticsProviderClient measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!}>
          <Providers locale={locale as Locale} messages={messages}>
            {draft ? (
              <VisualEditingSession>
                <VisualEditing.Toggle />
                <VisualEditing.Overlay locale={locale}>{children}</VisualEditing.Overlay>
                <LivePreviewListener />
                <VisualEditingEditRouter />
              </VisualEditingSession>
            ) : (
              children
            )}
          </Providers>
        </AnalyticsProviderClient>
      </body>
    </html>
  );
}
