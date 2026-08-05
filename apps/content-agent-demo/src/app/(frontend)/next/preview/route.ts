import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return new Response("Invalid path", { status: 400 });
  }

  (await draftMode()).enable();
  redirect(path);
}
