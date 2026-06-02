"use client";

import { NextIntlClientProvider } from "next-intl";
import React from "react";

import type { Locale } from "../types";
import { ThemeProvider } from "./Theme";

export const Providers: React.FC<{
  locale: Locale;
  messages: Record<string, string>;
  children: React.ReactNode;
}> = ({ children, locale, messages }) => (
  <NextIntlClientProvider locale={locale} messages={messages}>
    <ThemeProvider>{children}</ThemeProvider>
  </NextIntlClientProvider>
);
