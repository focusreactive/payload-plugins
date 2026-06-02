"use client";

import Script from "next/script";

interface Ga4ScriptsProps {
  measurementId: string;
}

export function Ga4Scripts({ measurementId }: Ga4ScriptsProps) {
  const initScript = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', { send_page_view: false });
  `;

  return (
    <>
      <Script id="ga4-script" src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />

      <Script id="ga4-init" strategy="afterInteractive">
        {initScript}
      </Script>
    </>
  );
}
