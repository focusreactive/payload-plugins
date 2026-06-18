import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

// Enables Next.js draft mode, then redirects to the requested frontend path.
// Live Preview points its iframe here so the page renders draft content (with
// the stega markers the visual-editing overlay needs).
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");

  // Same-origin relative paths only — block open redirects.
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return new Response("Invalid path", { status: 400 });
  }

  (await draftMode()).enable();
  redirect(path);
}
