/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/blocks/TalkGrid/Component.tsx
 *
 * Every row is rendered at every tier, with a lock badge where the body is gated. That is not a
 * shortcut - it is the model the deal is about. A gated talk still needs a crawlable page with a
 * real title, a teaser and topics, because "the archive is invisible to Google" is the problem
 * being solved. Hiding rows from visitors would rebuild the invisibility in a new stack.
 */

import Link from "next/link";

import { getPayloadClient, getTalks } from "@/dal";
import type { TalkTier } from "@/lib/talks/applyTier";
import { tierGrantsAccess } from "@/lib/talks/applyTier";
import { getReaderTier } from "@/lib/talks/getReaderTier";

interface Props {
  heading?: string | null;
  description?: string | null;
  source?: "recent" | "topic" | "kind" | "selected" | null;
  topic?: { slug?: string | null } | number | string | null;
  kind?: string | null;
  limit?: number | null;
  showKind?: boolean | null;
  showTier?: boolean | null;
  talkItems?: { talk?: { id?: number | string } | number | string | null }[] | null;
}

const TIER_LABELS: Record<string, string> = {
  "all-access": "All Access",
  basic: "Basic",
  premium: "Premium",
  visitor: "Free",
};

const formatKind = (kind?: string | null) =>
  kind ? kind.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()) : null;

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/** A relationship field arrives as an id or as a populated object depending on `depth`. */
const relationId = (value: unknown): number | string | null => {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const { id } = value as { id?: number | string };
    return id ?? null;
  }
  return null;
};

export async function TalkGridBlockComponent({
  description,
  heading,
  kind,
  limit,
  showKind,
  showTier,
  source,
  talkItems,
  topic,
}: Props) {
  const payload = await getPayloadClient();
  const readerTier = await getReaderTier();

  const topicSlug =
    topic && typeof topic === "object" && "slug" in topic ? (topic.slug ?? undefined) : undefined;

  const { docs } = await getTalks(payload, {
    ids:
      source === "selected"
        ? (talkItems ?? [])
            .map((item) => relationId(item.talk))
            .filter((id): id is number | string => id !== null)
        : undefined,
    kind: source === "kind" ? (kind ?? undefined) : undefined,
    limit: limit ?? 6,
    topicSlug: source === "topic" ? topicSlug : undefined,
  });

  if (!docs.length) {
    return (
      <section style={{ margin: "32px 0" }}>
        <h2 style={{ fontSize: 20 }}>{heading ?? "Talks"}</h2>
        <p style={{ color: "#888", fontSize: 14 }}>No published talks match this section yet.</p>
      </section>
    );
  }

  return (
    <section style={{ margin: "32px 0" }}>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>{heading ?? "Talks"}</h2>
      {description ? (
        <p style={{ color: "#666", fontSize: 14, marginTop: 0 }}>{description}</p>
      ) : null}

      <ul
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          listStyle: "none",
          padding: 0,
        }}
      >
        {docs.map((talk) => {
          const locked = !tierGrantsAccess(
            readerTier,
            (talk.requiredTier ?? "visitor") as TalkTier
          );
          const duration = formatDuration(talk.durationSeconds);

          return (
            <li key={talk.id} style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {showKind !== false && talk.kind ? (
                  <span
                    style={{
                      background: "#f0f0f0",
                      borderRadius: 3,
                      fontSize: 11,
                      padding: "2px 6px",
                    }}
                  >
                    {formatKind(talk.kind)}
                  </span>
                ) : null}
                {showTier !== false ? (
                  <span
                    style={{
                      background: locked ? "#fdf0d5" : "#eaf6ea",
                      borderRadius: 3,
                      fontSize: 11,
                      padding: "2px 6px",
                    }}
                  >
                    {locked ? `🔒 ${TIER_LABELS[talk.requiredTier ?? "visitor"]}` : "Readable"}
                  </span>
                ) : null}
                {duration ? <span style={{ color: "#888", fontSize: 11 }}>{duration}</span> : null}
                {talk.audioUrl ? <span style={{ color: "#888", fontSize: 11 }}>audio</span> : null}
              </div>

              <h3 style={{ fontSize: 15, lineHeight: 1.35, margin: "0 0 6px" }}>
                <Link
                  href={`/talks/${talk.slug}`}
                  style={{ color: "#111", textDecoration: "none" }}
                >
                  {talk.title}
                </Link>
              </h3>

              {talk.teaser ? (
                <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
                  {talk.teaser.slice(0, 160)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
