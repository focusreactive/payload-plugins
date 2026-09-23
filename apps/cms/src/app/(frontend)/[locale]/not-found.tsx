import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NextLink from "next/link";
import React from "react";

import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import { buttonVariants, ButtonVariant } from "@/components/button";
import { getPathname } from "@/lib/i18n/navigation";
import { getNotFoundSettings } from "@/dal/getNotFoundSettings";
import { DisplayHeading } from "@/components/DisplayHeading";
import type { Header as HeaderType, Footer as FooterType } from "@/payload-types";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";

interface Props {
  params?: Promise<{ locale: Locale }>;
}

export default async function NotFound() {
  // The locale the layout set, not the request headers: reading headers() here made every route
  // that can 404 render on demand, which was all of them.
  const locale = await resolveLocale();

  const [settings, t] = await Promise.all([
    getNotFoundSettings({ locale }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const homeHref = getPathname({ href: "/", locale });

  return (
    <div className="flex min-h-screen flex-col">
      <Header data={settings.header as HeaderType} disableActive />
      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 items-center py-[clamp(40px,6vw,72px)]">
          <div className="mx-auto flex w-full max-w-containerMaxW flex-col items-center gap-6 px-containerBase text-center">
            <DisplayHeading as="h1" size="display-1" text={settings.title || "Page not found"} />
            <p className="max-w-2xl text-lead text-muted-foreground">
              {settings.description ||
                "This path isn't in the content model - the rest of this demo is."}
            </p>
            <NextLink
              href={homeHref}
              className={buttonVariants({ variant: ButtonVariant.Primary })}
            >
              {t("goToHomepage")}
            </NextLink>
          </div>
        </section>
      </main>
      <Footer data={settings.footer as FooterType} />
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = params ? await params : undefined;
  const locale = await resolveLocale(resolvedParams?.locale);
  return generateNotFoundMeta({ locale });
}
