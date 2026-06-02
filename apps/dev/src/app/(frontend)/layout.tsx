import React from "react";
import { AnalyticsProviderClient } from "./AnalyticsProviderClient";
import "./styles.css";

export const metadata = {
  description: "A blank template using Payload in a Next.js app.",
  title: "Payload Blank Template",
};

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!;

  return (
    <html lang="en">
      <body>
        <AnalyticsProviderClient measurementId={measurementId}>
          <main>{children}</main>
        </AnalyticsProviderClient>
      </body>
    </html>
  );
}
