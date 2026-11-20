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

/**
 * Renders under the auth "API Key" field of the MCP API Keys collection.
 *
 * The plain key only exists client-side right after "Generate new API key" on an
 * unsaved document (it lives in form state at `apiKey`). Payload stores it
 * encrypted with `read: () => false`, so after save / reload only `hasAPIKey` is
 * known and the command falls back to a placeholder. Regenerating a key on an
 * already-saved document keeps the new key inside Payload's own APIKey component
 * state (it is never written to form state), so that case shows the placeholder too
 * while Payload displays the new key right above.
 */
export const ClaudeCodeMcpCommand: React.FC = () => {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();
  const { collectionSlug, data, id, lastUpdateTime } = useDocumentInfo();

  const apiKey = useFormFields(([fields]) => {
    const value = fields?.apiKey?.value;
    return typeof value === "string" && value.length > 0 ? value : null;
  });

  // SSR has no `window`, so start from the configured public URL and switch to the
  // origin the admin is actually served from once mounted (no hydration mismatch).
  const [origin, setOrigin] = useState(getServerSideURL);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Generating / revoking a key on a saved document PATCHes it directly and bumps
  // `lastUpdateTime`, but neither form state nor the PATCH response carry `hasAPIKey`,
  // so re-read it from the REST API whenever the document changes.
  const [hasPersistedKey, setHasPersistedKey] = useState(data?.hasAPIKey === true);
  useEffect(() => {
    if (!id || !collectionSlug) {
      return;
    }

    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch(
          `${apiRoute}/${collectionSlug}/${encodeURIComponent(String(id))}?depth=0`,
          { credentials: "include", signal: controller.signal }
        );
        if (!response.ok) {
          return;
        }
        const doc: { hasAPIKey?: boolean } = await response.json();
        setHasPersistedKey(doc.hasAPIKey === true);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to refresh API key state", error);
        }
      }
    };

    void refresh();
    return () => controller.abort();
  }, [apiRoute, collectionSlug, id, lastUpdateTime]);

  if (!apiKey && !hasPersistedKey) {
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
      {apiKey ? null : (
        <div className="field-description">
          Replace {KEY_PLACEHOLDER} with this key; it is only shown right after generating it.
        </div>
      )}
    </div>
  );
};
