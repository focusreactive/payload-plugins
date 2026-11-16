import React from "react";

/**
 * A 16px line as browsers build it from the original's `<p><em><p style>` nesting: the two empty
 * paragraphs are part of that result and carry the line's spacing.
 */
export function SmallPrint({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p>
        <em />
      </p>
      <p style={{ fontSize: "16px" }}>{children}</p>
      <p />
    </>
  );
}
