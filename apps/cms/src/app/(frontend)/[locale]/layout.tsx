import type { Viewport } from "next";
import localFont from "next/font/local";
import { getMessages, setRequestLocale } from "next-intl/server";
import { draftMode } from "next/headers";
import React from "react";

import { VisualEditing } from "@fr-private/payload-plugin-visual-editing/client";

import { Providers } from "@/lib/context";
import { AnalyticsProviderClient } from "@/lib/plugins/analytics/AnalyticsProviderClient";
import type { Locale } from "@/lib/types";
import { LivePreviewListener } from "@/components/LivePreviewListener";
import { VisualEditingEditRouter } from "@/components/VisualEditingEditRouter";

// Self-hosted rather than next/font/google: every build otherwise fetched three families from
// Google, and one failed hiccup takes the whole deployment down with "Can't resolve
// [next]/internal/font/google/archivo_*.module.css". Both ship as variable fonts, so one file
// covers the whole weight range.
const instrumentSans = localFont({
  display: "swap",
  src: [
    { path: "../../../fonts/InstrumentSans-variable.woff2", style: "normal", weight: "400 700" },
  ],
  variable: "--font-instrument-sans",
});

const inter = localFont({
  display: "swap",
  src: [{ path: "../../../fonts/Inter-variable.woff2", style: "normal", weight: "400 700" }],
  variable: "--font-inter",
});

// Newsreader for headlines and IBM Plex Sans for text, picked on 2026-09-23 over Instrument Sans
// with Inter. Newsreader ships its optical-size axis, so display headlines get the tighter
// high-contrast cut without a second file.
const newsreader = localFont({
  display: "swap",
  src: [{ path: "../../../fonts/Newsreader-variable.woff2", style: "normal", weight: "400 700" }],
  variable: "--font-newsreader",
});

const ibmPlexSans = localFont({
  display: "swap",
  src: [{ path: "../../../fonts/IBMPlexSans-variable.woff2", style: "normal", weight: "400 700" }],
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = localFont({
  display: "swap",
  src: [
    { path: "../../../fonts/IBMPlexMono-400.woff2", style: "normal", weight: "400" },
    { path: "../../../fonts/IBMPlexMono-500.woff2", style: "normal", weight: "500" },
  ],
  variable: "--font-ibm-plex-mono",
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
  // Tells next-intl the locale up front. Without it every getLocale() call in a block reads the
  // request headers, which opts the whole page out of static generation.
  setRequestLocale(locale);
  const { isEnabled: draft } = await draftMode();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-theme="light"
      className={`${instrumentSans.variable} ${inter.variable} ${newsreader.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head />
      <body>
        <AnalyticsProviderClient measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!}>
          <Providers locale={locale as Locale} messages={messages}>
            {draft ? (
              <VisualEditing.Provider available adminBasePath="/admin">
                <VisualEditing.Toggle />
                <VisualEditing.Overlay locale={locale}>{children}</VisualEditing.Overlay>
                <LivePreviewListener />
                <VisualEditingEditRouter />
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
