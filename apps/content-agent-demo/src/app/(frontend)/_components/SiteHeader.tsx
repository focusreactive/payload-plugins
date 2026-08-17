import config from "@payload-config";
import Link from "next/link";
import { getPayload } from "payload";

import type { Locale } from "@/lib/locales";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const payload = await getPayload({ config });
  const settings = await payload.findGlobal({ slug: "site-settings", locale, depth: 0 });

  return (
    <header className="site-header">
      <div className="wrap" style={{ paddingBottom: "1rem", paddingTop: "1rem" }}>
        <nav>
          <strong>{settings?.siteName}</strong>
          {settings?.nav?.map((item) => (
            <Link href={item.url} key={item.id ?? item.url}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
