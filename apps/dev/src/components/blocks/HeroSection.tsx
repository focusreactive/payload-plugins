import React from "react";

interface Props {
  title: string;
  description?: string;
}

export function HeroSection({ title, description }: Props) {
  return (
    <section style={{ borderBottom: "1px solid #eee", padding: "80px 40px" }}>
      <h1 style={{ fontSize: "3rem", margin: "0 0 16px" }}>{title}</h1>
      {description && (
        <p style={{ color: "#555", fontSize: "1.25rem", margin: 0 }}>
          {description}
        </p>
      )}
    </section>
  );
}
