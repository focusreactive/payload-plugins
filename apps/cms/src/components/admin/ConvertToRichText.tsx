"use client";

import { Button, useConfig, useField, useForm } from "@payloadcms/ui";
import { useState } from "react";

/**
 * Sidebar affordance on Markdown posts (§5.2): converts the Markdown body into the Lexical editor
 * through `POST /api/posts/convert-markdown`, writes `content` and flips `contentFormat`. The
 * change is a normal unsaved edit — review it, then save.
 */
export const ConvertToRichText: React.FC = () => {
  const { config } = useConfig();
  const { value: markdown } = useField<string>({ path: "markdown" });
  const { dispatchFields, setModified } = useForm();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function convert() {
    setStatus("working");
    try {
      const response = await fetch(
        `${config.serverURL}${config.routes.api}/posts/convert-markdown`,
        {
          body: JSON.stringify({ markdown: markdown ?? "" }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      const { content } = (await response.json()) as { content: unknown };
      dispatchFields({ path: "content", type: "UPDATE", value: content });
      dispatchFields({ path: "contentFormat", type: "UPDATE", value: "richText" });
      setModified(true);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={{ marginBottom: "var(--base)" }}>
      <p
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
          letterSpacing: "0.12em",
          margin: "0 0 8px",
          textTransform: "uppercase",
        }}
      >
        Imported from Markdown
      </p>
      <Button
        buttonStyle="secondary"
        disabled={status === "working"}
        onClick={convert}
        size="small"
      >
        {status === "working" ? "Converting…" : "Convert to rich text"}
      </Button>
      {status === "error" && (
        <p style={{ color: "var(--theme-error-500)", margin: "8px 0 0" }}>
          Conversion failed. The Markdown is unchanged.
        </p>
      )}
    </div>
  );
};
