import type { Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { getMessages } from "next-intl/server";
import { draftMode } from "next/headers";
import React from "react";

import { VisualEditing } from "@fr-private/payload-plugin-visual-editing/client";

import { Providers } from "@/core/context";
import { AnalyticsProviderClient } from "@/core/lib/analytics/AnalyticsProviderClient";
import type { Locale } from "@/core/types";
import { LivePreviewListener } from "@/features";

const newsreader = Newsreader({
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500", "600"],
});

const archivo = Archivo({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: [
    { color: "#eef2f3", media: "(prefers-color-scheme: light)" },
    { color: "#08100f", media: "(prefers-color-scheme: dark)" },
  ],
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
    <html
      lang={locale}
      data-theme="light"
      className={`${newsreader.variable} ${archivo.variable} ${ibmPlexMono.variable}`}
    >
      <head />
      <body>
        <AnalyticsProviderClient measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!}>
          <Providers locale={locale as Locale} messages={messages}>
            {draft ? (
              <VisualEditing.Provider available framedOnly adminBasePath="/admin">
                <VisualEditing.Toggle />
                <VisualEditing.Overlay locale={locale}>{children}</VisualEditing.Overlay>
                <LivePreviewListener />
              </VisualEditing.Provider>
            ) : (
              children
            )}
          </Providers>
        </AnalyticsProviderClient>
      </body>
    </html>
  );
}
