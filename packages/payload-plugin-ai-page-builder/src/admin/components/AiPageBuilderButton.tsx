"use client";

import { toast } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  collectionSlug: string;
  basePath: string;
};

export function AiPageBuilderButton({ collectionSlug, basePath }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api${basePath}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, collectionSlug }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      toast.success("Page generated — opening editor…");
      router.push(`/admin/collections/${collectionSlug}/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate page");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      void handleGenerate();
    }
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.4rem 0.85rem",
            borderRadius: "4px",
            border: "1px solid var(--theme-border-color, #ddd)",
            background: "var(--theme-bg, #fff)",
            color: "var(--theme-text, inherit)",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          ✨ Generate with AI
        </button>
      ) : (
        <div
          style={{
            padding: "1rem",
            border: "1px solid var(--theme-border-color, #ddd)",
            borderRadius: "6px",
            background: "var(--theme-bg, #fff)",
            maxWidth: "640px",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Generate page with AI
          </p>
          <p
            style={{
              margin: "0 0 0.75rem",
              fontSize: "0.8rem",
              opacity: 0.7,
            }}
          >
            Describe the page you want to create. The AI will pick from your configured blocks and generate content.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. A landing page for a SaaS product that helps teams manage projects, with a hero section and a features overview."
            rows={4}
            disabled={isLoading}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "0.5rem 0.75rem",
              borderRadius: "4px",
              border: "1px solid var(--theme-border-color, #ccc)",
              background: "var(--theme-input-bg, #fff)",
              color: "var(--theme-text, inherit)",
              fontSize: "0.875rem",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <p style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.75rem", opacity: 0.5 }}>Press Cmd/Ctrl+Enter to generate</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setPrompt("");
              }}
              disabled={isLoading}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "4px",
                border: "1px solid var(--theme-border-color, #ccc)",
                background: "transparent",
                color: "var(--theme-text, inherit)",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isLoading || !prompt.trim()}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "4px",
                border: "none",
                background: "#6366f1",
                color: "#fff",
                cursor: isLoading || !prompt.trim() ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                opacity: isLoading || !prompt.trim() ? 0.6 : 1,
              }}
            >
              {isLoading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiPageBuilderButton;
