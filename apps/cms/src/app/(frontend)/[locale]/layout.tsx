import type { Viewport } from "next";
import { Poppins } from "next/font/google";
import { getMessages } from "next-intl/server";
import { draftMode } from "next/headers";
import React from "react";

import { VisualEditing } from "@fr-private/payload-plugin-visual-editing/client";

import { Providers } from "@/lib/context";
import { AnalyticsProviderClient } from "@/lib/plugins/analytics/AnalyticsProviderClient";
import type { Locale } from "@/lib/types";
import { LivePreviewListener } from "@/components/LivePreviewListener";
import { VisualEditingEditRouter } from "@/components/VisualEditingEditRouter";

/**
 * One family for the whole site, which is the design system's own decision - display and body
 * differ by size and tracking, never by face.
 *
 * 400 and 500 are the only weights, and only those two are loaded. The public components that
 * still reached for a 600 were moved to 500 rather than kept alive by shipping a third weight -
 * there is no bold in this design, so a face that can render one is a face that will.
 */
const poppins = Poppins({
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: [
    { color: "#ffffff", media: "(prefers-color-scheme: light)" },
    { color: "#0b0d0c", media: "(prefers-color-scheme: dark)" },
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
    <html lang={locale} data-theme="light" className={poppins.variable}>
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
