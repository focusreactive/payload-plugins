"use client";

import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LINK_COPY_FEEDBACK_MS } from "../../../../constants";
import { IconButton } from "../../../../ui/IconButton";
import { Pill } from "../../../../ui/Pill";
import { cn, ROW_SEPARATOR } from "../../../../utils/style";
import type { LinkSuggestion, TextRange } from "../../../../links/types";

type CopyStatus = "idle" | "copied" | "failed";

const COPY_FEEDBACK = {
  idle: { label: "Copy link", Icon: Copy },
  copied: { label: "Copied", Icon: Check },
  failed: { label: "Copy failed", Icon: X },
} as const;

function CopyUrlButton({ url }: { url: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { label, Icon } = COPY_FEEDBACK[status];

  useEffect(
    () => () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    },
    []
  );

  const showFeedback = (next: CopyStatus) => {
    setStatus(next);
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => setStatus("idle"), LINK_COPY_FEEDBACK_MS);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showFeedback("copied");
    } catch {
      showFeedback("failed");
    }
  };

  return (
    <IconButton
      aria-label={label}
      onClick={copy}
      title={label}
      variant={status === "failed" ? "error" : "primary"}
    >
      <Icon aria-hidden="true" />
    </IconButton>
  );
}

function HighlightedSnippet({
  snippet,
  match,
}: Pick<LinkSuggestion, "snippet"> & { match: TextRange }) {
  return (
    <>
      {snippet.slice(0, match.start)}
      <strong>{snippet.slice(match.start, match.end)}</strong>
      {snippet.slice(match.end)}
    </>
  );
}

function matchesLabel(count: number): string {
  return count === 1 ? "1 match" : `${count} matches`;
}

interface LinkSuggestionRowProps {
  suggestion: LinkSuggestion;
  adminHref: string;
}

export function LinkSuggestionRow({ suggestion, adminHref }: LinkSuggestionRowProps) {
  return (
    <li className={cn("relative flex flex-col gap-[6px] px-[15px] py-[12px]", ROW_SEPARATOR)}>
      <div className="flex items-center gap-[8px]">
        <a
          className="font-semibold text-[12.5px] text-neutral-800 underline"
          href={adminHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          {suggestion.title}
        </a>
        <Pill variant="neutral">{matchesLabel(suggestion.count)}</Pill>
      </div>

      <div className="text-[11.5px] text-neutral-500">
        Matches <span className="font-medium text-neutral-800">“{suggestion.phrase}”</span>
      </div>

      <p className="m-0 text-[12px] text-neutral-700">
        <HighlightedSnippet snippet={suggestion.snippet} match={suggestion.snippetMatch} />
      </p>

      {suggestion.url ? (
        <div className="flex items-center gap-[8px]">
          <code className="flex-1 truncate font-mono text-[11px] text-neutral-600">
            {suggestion.url}
          </code>
          <CopyUrlButton url={suggestion.url} />
        </div>
      ) : (
        <div className="text-[11.5px] text-neutral-500">
          No public URL configured, open the page in the admin.
        </div>
      )}
    </li>
  );
}
