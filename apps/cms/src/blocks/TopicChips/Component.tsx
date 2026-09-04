/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/blocks/TopicChips/Component.tsx
 */

import Link from "next/link";

import { getPayloadClient } from "@/dal";

interface Props {
  heading?: string | null;
  description?: string | null;
  topicItems?:
    | { topic?: { slug?: string | null; title?: string | null } | number | string | null }[]
    | null;
}

export async function TopicChipsBlockComponent({ description, heading, topicItems }: Props) {
  // A relationship only arrives populated when the query asked for enough depth. The blocks on a
  // Page come back at the depth the page query chose, so an id here is normal rather than an
  // error - fall back to fetching the topics directly.
  const picked = (topicItems ?? [])
    .map((item) => item.topic)
    .filter((topic): topic is { slug?: string | null; title?: string | null } =>
      Boolean(topic && typeof topic === "object" && "title" in topic)
    );

  let topics = picked;
  if (!topics.length) {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "topic",
      limit: 12,
      overrideAccess: true,
      select: { slug: true, title: true },
      sort: "title",
    });
    topics = result.docs;
  }

  if (!topics.length) return null;

  return (
    <section style={{ margin: "32px 0" }}>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>{heading ?? "Start where you are"}</h2>
      {description ? (
        <p style={{ color: "#666", fontSize: 14, marginTop: 0 }}>{description}</p>
      ) : null}

      <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0 }}>
        {topics.map((topic) => (
          <li key={topic.slug ?? topic.title}>
            <Link
              href={`/topics/${topic.slug}`}
              style={{
                border: "1px solid #d4d4d4",
                borderRadius: 999,
                color: "#111",
                display: "inline-block",
                fontSize: 13,
                padding: "5px 12px",
                textDecoration: "none",
              }}
            >
              {topic.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
