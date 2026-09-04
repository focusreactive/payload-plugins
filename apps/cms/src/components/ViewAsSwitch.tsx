/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/components/ViewAsSwitch.tsx
 *
 * "View as: visitor / Basic / Premium / All Access" instead of a login (demo-plan.md §8).
 *
 * Two reasons this beats building sign-in for a demo: on a live call a switch flips instantly
 * where a login does not, and after handover the client explores every state without us creating
 * accounts for them. `vercel/commerce` was considered as a source of a ready-made login and does
 * not have one - its app/ is [page], api, product and search.
 *
 * A SERVER component with a form per button, not a client component writing document.cookie.
 * Three things fall out of that, in increasing order of importance:
 *
 *   - it satisfies the repo's `unicorn/no-document-cookie` rule rather than suppressing it
 *   - the switch works with JavaScript disabled, so a crawler-like client sees the same thing a
 *     visitor does
 *   - `cookies().set()` in a server action, followed by revalidatePath, means the next render is
 *     the authoritative one. The gated body is never sent to the browser and then hidden, which is
 *     the property being demonstrated on a deal about what crawlers can and cannot see.
 */

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { TALK_TIERS } from "@/collections/Talk";
import type { TalkTier } from "@/lib/talks/applyTier";
import { isTalkTier } from "@/lib/talks/applyTier";
import { VIEW_AS_COOKIE, VIEW_AS_MAX_AGE_SECONDS } from "@/lib/talks/viewAsCookie";

const LABELS: Record<TalkTier, string> = {
  "all-access": "All Access",
  basic: "Basic",
  premium: "Premium",
  visitor: "Visitor",
};

async function chooseTier(formData: FormData) {
  "use server";

  const tier = formData.get("tier");
  // Validated, not trusted: the value arrives from a form post, so an unknown string must fall
  // back to showing the least rather than being written through to the gate.
  if (!isTalkTier(tier)) return;

  const store = await cookies();
  store.set(VIEW_AS_COOKIE, tier, {
    httpOnly: false,
    maxAge: VIEW_AS_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });

  // "/" alone would not refresh a talk page, and the switch is used on both.
  revalidatePath("/", "layout");
}

export function ViewAsSwitch({ current }: { current: TalkTier }) {
  return (
    <div
      aria-label="Preview this page as a different membership tier"
      role="group"
      style={{
        alignItems: "center",
        background: "#fff",
        border: "1px solid #d4d4d4",
        borderRadius: 6,
        bottom: 16,
        display: "flex",
        gap: 4,
        padding: 6,
        position: "fixed",
        right: 16,
        zIndex: 50,
      }}
    >
      <span style={{ fontSize: 12, paddingInline: 6 }}>View as</span>
      {TALK_TIERS.map((tier) => (
        <form action={chooseTier} key={tier}>
          <input name="tier" type="hidden" value={tier} />
          <button
            aria-pressed={tier === current}
            style={{
              background: tier === current ? "#111" : "transparent",
              border: "1px solid #d4d4d4",
              borderRadius: 4,
              color: tier === current ? "#fff" : "#111",
              cursor: "pointer",
              fontSize: 12,
              padding: "4px 8px",
            }}
            type="submit"
          >
            {LABELS[tier]}
          </button>
        </form>
      ))}
    </div>
  );
}
