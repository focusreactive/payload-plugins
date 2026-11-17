import React from "react";

interface Feature {
  title: string;
  image?: { url?: string | null; alt?: string | null } | number | string | null;
  points?: { text: string }[] | null;
}

interface Props {
  heading?: string | null;
  items?: Feature[] | null;
}

export function FeaturesSection({ heading, items }: Props) {
  return (
    <section style={{ borderBottom: "1px solid #eee", padding: "60px 40px" }}>
      {heading && <h2 style={{ fontSize: "2rem", margin: "0 0 24px" }}>{heading}</h2>}
      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {(items ?? []).map((item, i) => (
          <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 20 }}>
            {item.image && typeof item.image === "object" && item.image.url ? (
              <img
                alt={item.image.alt ?? ""}
                src={item.image.url}
                style={{
                  aspectRatio: "16 / 10",
                  borderRadius: 6,
                  marginBottom: 12,
                  objectFit: "cover",
                  width: "100%",
                }}
              />
            ) : null}
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 12px" }}>{item.title}</h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {(item.points ?? []).map((point, j) => (
                <li key={j} style={{ lineHeight: 1.7 }}>
                  {point.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
