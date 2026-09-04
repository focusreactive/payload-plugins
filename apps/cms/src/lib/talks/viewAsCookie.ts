/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/lib/talks/viewAsCookie.ts
 *
 * The cookie name for the "view as" switch, alone in its own module on purpose.
 *
 * It is needed by a client component (ViewAsSwitch, which writes it) and by a server helper
 * (getReaderTier, which reads it). getReaderTier imports `next/headers`, so a client component
 * importing the constant from there would pull server-only code into the browser bundle and fail
 * the build. Declaring it twice with a "keep in sync" comment is the other way to get this wrong.
 */

export const VIEW_AS_COOKIE = "demo-view-as";

/** A walkthrough spans more than one page load, so the choice has to outlive the navigation. */
export const VIEW_AS_MAX_AGE_SECONDS = 86_400;
