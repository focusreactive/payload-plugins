"use client";

import { RefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

// Live Preview for App Router server components: when the document is saved in
// the admin, refresh the route so the server re-fetches the draft (re-embedding
// the stega markers the visual-editing overlay relies on). Per-keystroke client
// merging is intentionally avoided here — it would strip those markers.
export function LivePreviewListener({ serverURL }: { serverURL: string }) {
  const router = useRouter();
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />;
}
