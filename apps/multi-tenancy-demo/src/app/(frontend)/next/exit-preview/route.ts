import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

// Leaves draft mode and returns to the given path (or home), so the frontend
// reverts to published content.
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");
  (await draftMode()).disable();
  redirect(path && path.startsWith("/") && !path.startsWith("//") ? path : "/");
}
