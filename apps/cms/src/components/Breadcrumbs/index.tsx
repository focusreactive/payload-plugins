import { ChevronRight, HomeLine } from "@untitledui/icons";
import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/types";
import { getPathMap } from "@/dal/pathMap";
import { Container } from "@/components/shared";

interface Props {
  pageId: number;
  locale: Locale;
  /** An article or person shown under a listing page: the listing becomes a link and this closes the trail. */
  currentLabel?: string;
}

/**
 * Reads the ancestor chain from `idToBreadcrumbs`, which is keyed off the
 * nested-docs plugin's own per-locale labels (see pathMap.ts) rather than
 * re-deriving parents from the slug. A page whose chain is missing for this
 * locale renders nothing - a chain in the wrong language would misstate the
 * very thing this component exists to show, so there is no English fallback.
 * The home page is not a parent in the nested-docs tree, so Home is prepended
 * here and the home page itself gets no trail.
 */
export async function Breadcrumbs({ pageId, locale, currentLabel }: Props) {
  const pathMap = await getPathMap();
  const chain = pathMap.idToBreadcrumbs[pageId]?.[locale];

  if (!chain || chain.length === 0 || (!currentLabel && chain.at(-1)?.url === "/home")) {
    return null;
  }

  const t = await getTranslations("hierarchyNav");
  const ancestors = currentLabel ? chain : chain.slice(0, -1);
  const current = currentLabel ?? chain.at(-1)!.label;
  const linkClassName =
    "rounded-sm text-(--color-text-quaternary) transition-colors duration-100 hover:text-(--color-text-tertiary_hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)";

  return (
    <Container containerData={{}} className="pt-8 md:pt-10">
      <nav aria-label={t("breadcrumbLabel")} className="text-sm font-semibold">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li className="flex items-center gap-x-1.5">
            <Link href="/" locale={locale} className={linkClassName} aria-label={t("home")}>
              <HomeLine aria-hidden className="size-5" />
            </Link>
            <ChevronRight aria-hidden className="size-4 text-(--color-fg-quaternary)" />
          </li>
          {ancestors.map((crumb) => (
            <li key={crumb.url} className="flex items-center gap-x-1.5">
              <Link href={crumb.url} locale={locale} className={linkClassName}>
                {crumb.label}
              </Link>
              <ChevronRight aria-hidden className="size-4 text-(--color-fg-quaternary)" />
            </li>
          ))}
          <li
            aria-current="page"
            className="max-w-[40ch] truncate text-(--color-text-brand-secondary)"
          >
            {current}
          </li>
        </ol>
      </nav>
    </Container>
  );
}
