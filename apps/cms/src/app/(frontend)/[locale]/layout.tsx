import type { Viewport } from "next";
import { getMessages } from "next-intl/server";
import { draftMode } from "next/headers";
import React from "react";

import { Providers } from "@/core/context";
import { GoogleAnalyticsScript } from "@/core/lib/analytics/GoogleAnalyticsScript";
import type { Locale } from "@/core/types";
import { LivePreviewListener } from "@/features";

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
    <html lang={locale} className="light">
      <head />
      <body>
        <Providers locale={locale as Locale} messages={messages}>
          {children}
          {draft && <LivePreviewListener />}
        </Providers>
        <GoogleAnalyticsScript
          measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
        />
      </body>
    </html>
  );
}
