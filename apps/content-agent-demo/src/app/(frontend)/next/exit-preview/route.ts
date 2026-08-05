import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");
  (await draftMode()).disable();
  redirect(path && path.startsWith("/") && !path.startsWith("//") ? path : "/");
}
