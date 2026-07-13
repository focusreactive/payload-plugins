import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import NextLink from "next/link";
import React from "react";

import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import { buttonVariants, ButtonVariant } from "@/components/button";
import { getPathname } from "@/lib/i18n/navigation";
import { getNotFoundSettings } from "@/dal/getNotFoundSettings";
import type { Header as HeaderType, Footer as FooterType } from "@/payload-types";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";

interface Props {
  params?: Promise<{ locale: Locale }>;
}

export default async function NotFound() {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";

  const segments = pathname.split("/").filter(Boolean);
  const locale = await resolveLocale(segments[0] as Locale | undefined);

  const [settings, t] = await Promise.all([
    getNotFoundSettings({ locale }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  const homeHref = getPathname({ href: "/", locale });

  return (
    <div className="flex min-h-screen flex-col">
      <Header data={settings.header as HeaderType} disableActive />
      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 items-center justify-center py-12 px-4 sm:py-16 sm:px-6 md:py-20 md:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {settings.title || "404 - Page not found"}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              {settings.description ||
                "Unfortunately, the requested page does not exist or has been deleted."}
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
