import type { Viewport } from "next";
import { IBM_Plex_Mono, Inter, Inter_Tight, Noto_Sans_JP } from "next/font/google";
import { getMessages } from "next-intl/server";
import { draftMode } from "next/headers";
import React from "react";

import { VisualEditing } from "@fr-private/payload-plugin-visual-editing/client";

import { Providers } from "@/lib/context";
import { AnalyticsProviderClient } from "@/lib/plugins/analytics/AnalyticsProviderClient";
import type { Locale } from "@/lib/types";
import { LivePreviewListener } from "@/components/LivePreviewListener";
import { PlausibleScript } from "@/components/PlausibleScript";
import { SkipLink } from "@/components/SkipLink";
import { FEEDS } from "@/lib/config/feeds";
import { VisualEditingEditRouter } from "@/components/VisualEditingEditRouter";

// CT brand fonts (§6.3). Variable names stay those base.css maps: --font-newsreader → display,
// --font-archivo → sans, --font-ibm-plex-mono → mono; --font-ja is switched on for :lang(ja).
const interTight = Inter_Tight({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["600", "700"],
});

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-archivo",
});

const ibmPlexMono = IBM_Plex_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
});

const notoSansJp = Noto_Sans_JP({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-ja",
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#124853", media: "(prefers-color-scheme: dark)" },
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
      className={`${interTight.variable} ${inter.variable} ${ibmPlexMono.variable} ${notoSansJp.variable}`}
    >
      <head>
        <link rel="alternate" type="application/atom+xml" title="Atom" href={FEEDS.allAtom} />
        <link rel="alternate" type="application/rss+xml" title="RSS" href={FEEDS.allRss} />
        <PlausibleScript />
      </head>
      <body>
        <SkipLink />
        <AnalyticsProviderClient measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}>
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
