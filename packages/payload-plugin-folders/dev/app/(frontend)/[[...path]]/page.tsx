import config from "@payload-config";
import { getAllPaths, resolvePath } from "@focus-reactive/payload-plugin-folders/server";
// The `.js` suffix on next/* is what the package's NodeNext type-check needs; webpack resolves the same file.
import { draftMode } from "next/headers.js";
import { notFound, permanentRedirect } from "next/navigation.js";
import { getPayload } from "payload";

import { splitLocalePrefix } from "../locales.js";
import { RenderDocument } from "../RenderDocument.js";

export async function generateStaticParams() {
  const payload = await getPayload({ config });
  const rows = await getAllPaths(payload, { locale: "en" });

  return rows.map(({ fullPath }) => ({
    path: fullPath === "/" ? [] : fullPath.slice(1).split("/"),
  }));
}

const Page = async ({ params }: { params: Promise<{ path?: string[] }> }) => {
  const { path = [] } = await params;
  const { isEnabled: draft } = await draftMode();
  const payload = await getPayload({ config });
  const { locale, segments } = await splitLocalePrefix(path);
  const result = await resolvePath(payload, { draft, locale, path: `/${segments.join("/")}` });

  if (result.type === "redirect") {
    // The resolver answers an unprefixed path; a visitor of /de/... stays under /de.
    const defaultLocale = payload.config.localization
      ? payload.config.localization.defaultLocale
      : locale;
    permanentRedirect(
      locale === defaultLocale ? result.to : `/${locale}${result.to === "/" ? "" : result.to}`
    );
  }
  if (result.type === "notFound") {
    notFound();
  }

  return <RenderDocument collection={result.collection} doc={result.doc} />;
};

export default Page;
