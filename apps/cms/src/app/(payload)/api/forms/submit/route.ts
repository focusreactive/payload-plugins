import { NextResponse } from "next/server";

import { getPayloadClient } from "@/dal";

/**
 * POST /api/forms/submit — the form block (internal mode) and the newsletter band (§5.6).
 * Stores a `form-submissions` row through the Local API (REST create stays closed). JSON clients
 * (the fetch enhancement) get `{ ok }`; plain form posts get a 303 back to the page's success
 * anchor so the flow works without JavaScript.
 */

const MAX_BYTES = 2048;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const RESERVED = new Set(["formId", "formName", "page", "referrer", "website"]);
const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;

// Demo-grade abuse control: per-instance memory, good enough for one container.
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

function safeUrl(value: string | null | undefined, base: string): URL | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  // A relative Location (RFC 7231) keeps the visitor on whichever host they used (Nginx, Vercel
  // preview, localhost) and can never point at another site.
  const reply = (status: number, location?: string) =>
    wantsJson || !location
      ? NextResponse.json({ ok: status < 400 }, { status })
      : new Response(null, { headers: { Location: location }, status: 303 });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BYTES) {
    return reply(413);
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return reply(429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400);
  }

  const origin = new URL(request.url).origin;
  // The form's own page: the hidden input (filled by JS) or the Referer of the POST.
  const page = safeUrl(text(form.get("page")) || request.headers.get("referer"), origin);
  const formId = text(form.get("formId")).replace(/[^\w-]/gu, "");
  // Collapse leading slashes so the path can never become a protocol-relative URL (//host).
  const pagePath = page ? `${page.pathname.replace(/^\/+/u, "/")}${page.search}` : null;
  const successUrl = pagePath ? `${pagePath}#form-${formId}-ok` : undefined;

  // Honeypot: bots fill the hidden "website" field. Pretend success, store nothing.
  if (text(form.get("website"))) {
    return reply(200, successUrl);
  }

  const formName = text(form.get("formName")).slice(0, 100);
  if (!formName) {
    return reply(400);
  }

  const data: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (!RESERVED.has(key) && typeof value === "string") {
      data[key.slice(0, 64)] = value.slice(0, 1000);
    }
  }
  const email =
    data.email ?? Object.values(data).find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value));

  const utm = Object.fromEntries(
    UTM_KEYS.map((key) => [key, page?.searchParams.get(`utm_${key}`) ?? undefined])
  );

  const payload = await getPayloadClient();
  await payload.create({
    collection: "form-submissions",
    data: {
      data,
      email: email ?? null,
      formName,
      page: pagePath,
      referrer: text(form.get("referrer")) || null,
      utm,
    },
    overrideAccess: true,
  });

  return reply(200, successUrl);
}
