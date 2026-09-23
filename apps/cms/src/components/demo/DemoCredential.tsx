"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface DemoCredentialProps {
  email: string;
  password: string;
}

function CopyRow({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const [copied, setCopied] = useState(false);

  // navigator.clipboard is undefined on any non-secure origin, which includes a plain-http
  // preview, so the demo must not depend on it being there.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-quaternary">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-secondary">
        {masked ? "•".repeat(12) : value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
        className="shrink-0 rounded-md p-1 text-quaternary transition hover:bg-primary_hover hover:text-secondary"
      >
        {copied ? <Check size={14} className="text-icon-fg-brand" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

/**
 * The four demo logins are handed over after the call, so the page shows them rather than making
 * someone copy them out of a chat message. The password is masked on screen because the page is
 * screen-shared live, and the copy button is the only way to read it.
 */
export function DemoCredential({ email, password }: DemoCredentialProps) {
  return (
    <div className="mt-1 w-full max-w-xs space-y-1 rounded-lg bg-secondary p-3">
      <CopyRow label="Email" value={email} />
      <CopyRow label="Password" value={password} masked />
    </div>
  );
}
