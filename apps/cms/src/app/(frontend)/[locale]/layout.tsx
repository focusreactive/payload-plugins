import type { Viewport } from "next";
import { getMessages } from "next-intl/server";
import { draftMode } from "next/headers";
import React from "react";

import { VisualEditing } from "@focus-reactive/payload-plugin-visual-editing/client";

import { Providers } from "@/lib/context";
import { AnalyticsProviderClient } from "@/lib/plugins/analytics/AnalyticsProviderClient";
import type { Locale } from "@/lib/types";
import { LivePreviewListener } from "@/components/LivePreviewListener";
import { VisualEditingEditRouter } from "@/components/VisualEditingEditRouter";

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
    <html lang={locale} data-theme="light">
      <head />
      <body suppressHydrationWarning>
        <AnalyticsProviderClient measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!}>
          <Providers locale={locale as Locale} messages={messages}>
            {draft ? (
              <VisualEditing.Provider available instantPreview adminBasePath="/admin">
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
