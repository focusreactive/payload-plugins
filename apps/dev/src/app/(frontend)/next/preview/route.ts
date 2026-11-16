import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

// Live Preview loads pages through here, so the page renders the draft with visual-editing markers.
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return new Response("Invalid path", { status: 400 });
  }
  (await draftMode()).enable();
  redirect(path);
}
