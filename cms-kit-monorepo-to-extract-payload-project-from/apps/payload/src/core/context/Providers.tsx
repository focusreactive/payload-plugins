"use client";

import { ABAnalyticsProvider } from "@focus-reactive/payload-plugin-ab/analytics/client";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import { analyticsAdapter } from "../lib/abTesting/analyticsAdapter";
import type { Locale } from "../types";
import { ThemeProvider } from "./Theme";

export const Providers: React.FC<{
  locale: Locale;
  messages: Record<string, string>;
  children: React.ReactNode;
}> = ({ children, locale, messages }) => (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ABAnalyticsProvider adapter={analyticsAdapter}>
        <ThemeProvider>{children}</ThemeProvider>
      </ABAnalyticsProvider>
    </NextIntlClientProvider>
  );
