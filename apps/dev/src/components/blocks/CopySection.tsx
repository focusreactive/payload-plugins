import React from "react";

interface Props {
  text: string;
}

export function CopySection({ text }: Props) {
  return (
    <section style={{ borderBottom: "1px solid #eee", padding: "60px 40px" }}>
      <p style={{ fontSize: "1.125rem", lineHeight: 1.7, margin: 0 }}>{text}</p>
    </section>
  );
}
