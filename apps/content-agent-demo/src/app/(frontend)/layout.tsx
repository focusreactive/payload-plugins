import type { ReactNode } from "react";

import "./styles.css";

export const metadata = {
  title: "Content Agent Demo",
  description: "Payload CMS demo app driven by an AI content agent",
};

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
