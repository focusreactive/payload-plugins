import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

import { getInsightHref, getPersonHref } from "@/dal";
import { revalidatePathMap } from "@/lib/dal/pathMap";
import type { Locale } from "@/lib/types";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import { normalizeRedirectPath, normalizeRedirectToUrl } from "@/lib/utils/redirectUrl";
import type { Insight, Page, Person } from "@/payload-types";

/**
 * Set on `req.context` by a write that re-creates demo content (the demo seed, the Passle fixture
 * ingest). A reseed puts slugs back to their seeded values, and without this every address an
 * editor had changed during a session would come back as a redirect pointing at the reset one.
 */
export const SKIP_REDIRECT_ON_SLUG_CHANGE = "skipRedirectOnSlugChange";

// Insight and person addresses are only ever resolved for the three languages the demo site
// publishes; the other configured locales have no listing page to hang them off.
const SITE_LOCALES: Locale[] = ["en", "fr", "ja"];

// getInsightHref/getPersonHref/buildUrl all return the browser-visible address with its locale
// prefix ("/fr/actualites/..."). PayloadRedirects matches `from` against parseSlugToPath's `url`,
// which is the address AFTER Next's [locale] segment has been stripped, so `from` is stored
// un-prefixed. `to.url` is handed straight to Next's redirect(), so it keeps the prefix: an
// un-prefixed French target would land on the English route and 404.
function stripLocalePrefix(locale: Locale, path: string): string {
  const prefix = `/${locale}`;
  if (path === prefix) return "/";
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path;
}

function pageHref(doc: Pick<Page, "breadcrumbs"> | null | undefined, locale: Locale) {
  if (!doc) return null;
  // The homepage resolves to "" here, so it can never become either end of a redirect.
  return (
    buildUrl({ absolute: false, breadcrumbs: doc.breadcrumbs, collection: "page", locale }) || null
  );
}

async function insightHref(doc: Pick<Insight, "slug"> | null | undefined, locale: Locale) {
  if (!doc?.slug) return null;
  return getInsightHref({ slug: doc.slug }, locale);
}

async function personHref(doc: Pick<Person, "name"> | null | undefined, locale: Locale) {
  if (!doc?.name) return null;
  return getPersonHref({ name: doc.name }, locale);
}

/**
 * Points every redirect at content that is actually live, so a visitor never hops through more
 * than one redirect and a slug can never end up redirecting to itself.
 *
 * - A redirect that already led to the old address is repointed straight to the new one, which
 *   collapses what would otherwise become a two-hop chain (old -> older -> current).
 * - A redirect that used to lead away FROM the new address is removed: that address is live
 *   content again, so it cannot also be a signpost sending visitors elsewhere.
 * - The old address itself gets a redirect to the new one, reusing a redirect document that
 *   already carries that "from" instead of creating a duplicate.
 *
 * Only "custom" (literal-URL) redirects can go stale this way. A "reference" redirect (pointing at
 * a page/post document rather than a URL string) resolves the live document's current path at
 * request time - see PayloadRedirects - so it never needs repointing here.
 */
async function reconcileRedirect(
  req: PayloadRequest,
  oldHref: string,
  newHref: string,
  locale: Locale
): Promise<boolean> {
  const fromOld = normalizeRedirectPath(stripLocalePrefix(locale, oldHref));
  const fromNew = normalizeRedirectPath(stripLocalePrefix(locale, newHref));
  const targetOld = normalizeRedirectToUrl(oldHref);
  const targetNew = normalizeRedirectToUrl(newHref);
  if (!fromOld || !fromNew || fromOld === fromNew) return false;

  const { payload } = req;
  const findArgs = {
    collection: "redirects" as const,
    depth: 0,
    limit: 100,
    locale,
    overrideAccess: true,
    req,
  };
  const newTarget = { to: { type: "custom" as const, url: targetNew } };

  const incoming = await payload.find({
    ...findArgs,
    where: { and: [{ "to.type": { equals: "custom" } }, { "to.url": { equals: targetOld } }] },
  });
  for (const redirectDoc of incoming.docs) {
    if (redirectDoc.from === fromNew) {
      // Repointing this one would make it redirect to itself - the exact loop this function
      // exists to prevent - so the stale hop is removed instead of repointed.
      await payload.delete({
        collection: "redirects",
        id: redirectDoc.id,
        overrideAccess: true,
        req,
      });
    } else {
      await payload.update({
        collection: "redirects",
        data: newTarget,
        id: redirectDoc.id,
        locale,
        overrideAccess: true,
        req,
      });
    }
  }

  const outgoingFromNewPath = await payload.find({
    ...findArgs,
    where: { from: { equals: fromNew } },
  });
  for (const redirectDoc of outgoingFromNewPath.docs) {
    await payload.delete({
      collection: "redirects",
      id: redirectDoc.id,
      overrideAccess: true,
      req,
    });
  }

  const existingFromOldPath = await payload.find({
    ...findArgs,
    limit: 1,
    where: { from: { equals: fromOld } },
  });
  const existingRedirect = existingFromOldPath.docs[0];
  if (existingRedirect) {
    await payload.update({
      collection: "redirects",
      data: { ...newTarget, isActive: true },
      id: existingRedirect.id,
      locale,
      overrideAccess: true,
      req,
    });
  } else {
    await payload.create({
      collection: "redirects",
      data: { from: fromOld, isActive: true, ...newTarget, type: "308" },
      locale,
      overrideAccess: true,
      req,
    });
  }
  return true;
}

async function reconcileAddressChanges(
  req: PayloadRequest,
  changes: { locale: Locale; oldHref: string | null; newHref: string | null }[],
  { revalidateOldAddresses }: { revalidateOldAddresses: boolean }
) {
  let anyRedirectWritten = false;
  for (const { locale, oldHref, newHref } of changes) {
    if (oldHref && newHref) {
      anyRedirectWritten =
        (await reconcileRedirect(req, oldHref, newHref, locale)) || anyRedirectWritten;
    }
  }
  // Articles and people render through the catch-all route, which is statically generated for
  // every old address and only fetches redirects once the address stops resolving. Until that
  // render is thrown away the old address keeps serving the article instead of redirecting.
  // Every page render reads the path map, so dropping it clears them all. Pages skip this because
  // revalidatePage already drops the path map on every save.
  if (anyRedirectWritten && revalidateOldAddresses && !req.context.disableRevalidate) {
    revalidatePathMap();
  }
}

export const redirectOnPageSlugChange: CollectionAfterChangeHook<Page> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context[SKIP_REDIRECT_ON_SLUG_CHANGE]) return doc;
  // Only a page that was already published had a real address for anyone to have visited or
  // bookmarked, and only a page that is still published after this save has somewhere live to
  // send them - an unpublish is not a rename, so it gets no redirect.
  if (previousDoc?._status !== "published" || doc._status !== "published") return doc;

  const locale = getLocaleFromRequest(req);
  await reconcileAddressChanges(
    req,
    [{ locale, oldHref: pageHref(previousDoc, locale), newHref: pageHref(doc, locale) }],
    { revalidateOldAddresses: false }
  );
  return doc;
};

// Insights and people have no drafts, so every save is a publish and needs no status check.
export const redirectOnInsightSlugChange: CollectionAfterChangeHook<Insight> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context[SKIP_REDIRECT_ON_SLUG_CHANGE] || !previousDoc) return doc;

  // The slug is localized, so a save changes only the address in the language being edited.
  const locale = getLocaleFromRequest(req);
  const [oldHref, newHref] = await Promise.all([
    insightHref(previousDoc, locale),
    insightHref(doc, locale),
  ]);
  await reconcileAddressChanges(req, [{ locale, oldHref, newHref }], {
    revalidateOldAddresses: true,
  });
  return doc;
};

export const redirectOnPersonSlugChange: CollectionAfterChangeHook<Person> = async ({
  doc,
  previousDoc,
  req,
}) => {
  // A person has no slug field of its own - the address is derived from `name` (see
  // getListingRoutes#personSlug), which is not localized - so one name edit moves the address
  // in every site language at once.
  if (req.context[SKIP_REDIRECT_ON_SLUG_CHANGE] || !previousDoc) return doc;
  if (previousDoc.name === doc.name) return doc;

  const changes = await Promise.all(
    SITE_LOCALES.map(async (locale) => ({
      locale,
      oldHref: await personHref(previousDoc, locale),
      newHref: await personHref(doc, locale),
    }))
  );
  await reconcileAddressChanges(req, changes, { revalidateOldAddresses: true });
  return doc;
};
