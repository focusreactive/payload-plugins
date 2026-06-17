import React from "react";
import "./styles.css";

export const metadata = {
  description: "A minimal demo of @payloadcms/plugin-multi-tenant.",
  title: "Multi-Tenancy Demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
