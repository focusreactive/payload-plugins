import React from "react";

interface Cta {
  label: string;
  url: string;
}

interface MediaImage {
  url?: string | null;
  alt?: string | null;
}

interface Props {
  title: string;
  description?: string;
  image?: MediaImage | null;
  cta?: Cta[] | null;
}

export function HeroSection({ title, description, image, cta }: Props) {
  return (
    <section style={{ borderBottom: "1px solid #eee", padding: "80px 40px" }}>
      <h1 style={{ fontSize: "3rem", margin: "0 0 16px" }}>{title}</h1>
      {description && <p style={{ color: "#555", fontSize: "1.25rem", margin: "0 0 24px" }}>{description}</p>}
      {image?.url && <img alt={image.alt ?? ""} src={image.url} style={{ borderRadius: 8, margin: "0 0 24px", maxWidth: "100%" }} />}
      {cta && cta.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {cta.map((item, i) => (
            <a href={item.url} key={i} style={{ background: "#111", borderRadius: 6, color: "#fff", padding: "10px 20px", textDecoration: "none" }}>
              {item.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
