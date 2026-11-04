Source for decision 42 and README 'Trailing slashes'.

# Trailing slashes: what the docs say (read 4 Nov 2026)

Grades: A = quoted from the page, read today; B = read today, paraphrased; C = my inference, not on any page.

## Google Search Central

Sources read:
- [To slash or not to slash](https://developers.google.com/search/blog/2010/04/to-slash-or-not-to-slash) (Search Central blog, April 2010)
- [How to specify a canonical URL with rel="canonical" and other methods](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) (current docs, no date shown)

| Claim | Grade |
|---|---|
| Google treats `/a` and `/a/` as two separate URLs: it "treats each URL above separately (and equally) regardless of whether it's a file or a directory". | A |
| Google prefers neither form: "you can choose whichever you like". A trailing slash is "more conventional" for directory URLs. | A |
| Fix duplicates with "a `301` redirect from the duplicate to the preferred version"; when that is not possible, `rel="canonical"` "works similarly to a `301` for Google's indexing purposes". | A |
| "Be consistent with the preferred version. Use it in your internal links." Sitemaps list the preferred version only. | A |
| The preferred URL answers 200, the duplicate answers 301 to it. | A |
| The root is the exception: `https://example.com` and `https://example.com/` are equivalent and cannot be redirected. | A |
| Serving the same content on both forms "is perfectly legitimate and a-okay", but not ideal. | A |
| The current canonicalization page does not mention trailing slashes. It ranks redirects and `rel="canonical"` as strong signals and sitemaps as weak, says the methods stack, says not to give different canonicals through different methods, and says "link to the canonical URL rather than a duplicate URL". | A |

## Next.js `trailingSlash`

Source read: [next.config.js trailingSlash](https://nextjs.org/docs/app/api-reference/config/next-config-js/trailingSlash) (lastUpdated 2025-06-16).

| Claim | Grade |
|---|---|
| By default Next.js redirects a URL with a trailing slash to the one without: "`/about/` will redirect to `/about`". | A |
| `trailingSlash: true` reverses it: "`/about` will redirect to `/about/`". | A |
| With `true`, static file URLs (with an extension) and paths under `.well-known/` get no slash added. | A |
| The page does not state the status code of this redirect. | B |
| So a Next.js site already answers one URL form and redirects the other, with no plugin code. | C, follows from the two A rows |

## Vercel `trailingSlash`

Source read: [vercel.json trailingSlash](https://vercel.com/docs/project-configuration/vercel-json#trailingslash) (last_updated 2026-08-14).

| Claim | Grade |
|---|---|
| Default `undefined`: "visiting a path with or without a trailing slash will not redirect", which Vercel calls "not recommended because it could lead to search engines indexing two different pages with duplicate content". | A |
| `false`: a path ending in a slash answers 308 and redirects to the path without it. | A |
| `true`: a path without a slash answers 308 and redirects to the path with it; paths with a file extension do not redirect. | A |
| The page does not say how this setting interacts with Next.js's own `trailingSlash`. | B |
| On Vercel with Next.js, the Next.js redirect applies whatever the Vercel setting, because it runs in the app. I did not read a page that says so. | C |

## What this means for the plugin

The docs support the ruling's direction:
- Search engines want one form, a permanent redirect from the other, and internal links in the preferred form (Google, A).
- The framework already does the redirect: Next.js by default and with `trailingSlash: true` (A), Vercel when its setting is `true` or `false` (A). A plugin redirect of its own would duplicate it, and in the wrong form it would loop against the framework's.
- What only the plugin can get right is consistency: every URL it stores or emits, internal links included, in the form the framework serves. A mismatch makes every internal link and every redirect target take an extra hop through the framework's redirect.
- The root `/` stays `/` in both forms (Google, A).

Nothing read contradicts the direction, so P-37 is not BLOCKED.
