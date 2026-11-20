"use client";

import { CopyToClipboard, useConfig, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import { useEffect, useState } from "react";

import { getServerSideURL } from "@/lib/utils/getURL";

/** Stable name the CMS is registered under in Claude Code (`claude mcp list`). */
const SERVER_NAME = "payload-cms";

/**
 * Path `@payloadcms/plugin-mcp` mounts its endpoint on, relative to `routes.api`
 * (`config.endpoints.push({ path: "/mcp" })` → `/api/mcp` by default).
 */
const MCP_ENDPOINT_PATH = "/mcp";

const KEY_PLACEHOLDER = "<YOUR_API_KEY>";

type PersistedKeyState =
  /** The stored key was revealed. */
  | { status: "revealed"; apiKey: string }
  /** A key is stored but the reveal endpoint refused it (e.g. not the key's owner). */
  | { status: "refused" }
  /** No key is stored on the document. */
  | { status: "none" };

interface PersistedKeyResult {
  /** Which document version (`id` + `lastUpdateTime`) this result belongs to. */
  requestKey: string;
  state: PersistedKeyState;
}

async function fetchPersistedKeyState(
  baseURL: string,
  signal: AbortSignal
): Promise<PersistedKeyState> {
  // Enabled by `auth.useAPIKey.reveal` on the collection (see lib/plugins/mcp).
  // 403 → caller may not reveal this key, 404 → no key stored (or not readable).
  const revealResponse = await fetch(`${baseURL}/api-key/reveal`, {
    credentials: "include",
    method: "POST",
    signal,
  });
  if (revealResponse.ok) {
    const { apiKey }: { apiKey?: unknown } = await revealResponse.json();
    if (typeof apiKey === "string" && apiKey.length > 0) {
      return { apiKey, status: "revealed" };
    }
  }

  // Refused: tell "no key" apart from "key exists but can't be revealed".
  const docResponse = await fetch(`${baseURL}?depth=0`, { credentials: "include", signal });
  if (!docResponse.ok) {
    return { status: "none" };
  }
  const doc: { hasAPIKey?: boolean } = await docResponse.json();
  return doc.hasAPIKey === true ? { status: "refused" } : { status: "none" };
}

/**
 * Renders under the auth "API Key" field of the MCP API Keys collection.
 *
 * Right after "Generate new API key" on an unsaved document the plain key lives in
 * form state (`apiKey`). Once saved, Payload stores it encrypted, so the key is read
 * back through Payload's reveal endpoint whenever the document loads or changes
 * (generate / regenerate / revoke bump `lastUpdateTime`). Fetching on mount — not on
 * copy — keeps the displayed command and the copied one identical. The placeholder
 * is only used when a stored key exists but the reveal call is refused.
 */
export const ClaudeCodeMcpCommand: React.FC = () => {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();
  const { collectionSlug, id, lastUpdateTime } = useDocumentInfo();

  const formKey = useFormFields(([fields]) => {
    const value = fields?.apiKey?.value;
    return typeof value === "string" && value.length > 0 ? value : null;
  });

  // SSR has no `window`, so start from the configured public URL and switch to the
  // origin the admin is actually served from once mounted (no hydration mismatch).
  const [origin, setOrigin] = useState(getServerSideURL);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const requestKey = `${String(id)}:${String(lastUpdateTime)}`;
  const [persisted, setPersisted] = useState<PersistedKeyResult | null>(null);
  useEffect(() => {
    if (!id || !collectionSlug) {
      return;
    }

    const controller = new AbortController();
    const baseURL = `${apiRoute}/${collectionSlug}/${encodeURIComponent(String(id))}`;
    const load = async () => {
      try {
        const state = await fetchPersistedKeyState(baseURL, controller.signal);
        setPersisted({ requestKey, state });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load the MCP API key", error);
          setPersisted({ requestKey, state: { status: "refused" } });
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [apiRoute, collectionSlug, id, requestKey]);

  // Results for an older document version are stale (e.g. the key was regenerated).
  const persistedState = persisted?.requestKey === requestKey ? persisted.state : null;
  const revealedKey = persistedState?.status === "revealed" ? persistedState.apiKey : null;
  const apiKey = formKey ?? revealedKey;
  const isRefused = !apiKey && persistedState?.status === "refused";

  if (!apiKey && !isRefused) {
    return null;
  }

  const endpoint = `${origin}${apiRoute}${MCP_ENDPOINT_PATH}`;
  const command = `claude mcp add --transport http ${SERVER_NAME} ${endpoint} --header "Authorization: Bearer ${apiKey ?? KEY_PLACEHOLDER}"`;

  return (
    <div className="field-type">
      <div
        className="field-label"
        style={{ alignItems: "center", display: "flex", gap: "0.25rem" }}
      >
        <span>Add to Claude Code</span>
        <CopyToClipboard value={command} />
      </div>
      <pre
        style={{
          background: "var(--theme-elevation-50)",
          border: "1px solid var(--theme-elevation-150)",
          borderRadius: "var(--style-radius-s)",
          color: "var(--theme-elevation-800)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          margin: 0,
          overflowWrap: "anywhere",
          padding: "0.75rem 1rem",
          whiteSpace: "pre-wrap",
        }}
      >
        {command}
      </pre>
      {isRefused ? (
        <div className="field-description">
          Only the key&apos;s owner can reveal it. Replace {KEY_PLACEHOLDER} with the key.
        </div>
      ) : null}
    </div>
  );
};
