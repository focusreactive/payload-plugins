"use client";

import { Button } from "@payloadcms/ui";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import type { DeployLog, DeployStatus, DeploySummary, DeployTone } from "../types.js";
import type { DeployAction } from "./useDeploy.js";

/** What the panel shows: Netlify's phase, overridden while a request of ours is on its way. */
export type DeployView = DeployStatus["phase"] | "starting" | "publishing";

type Props = {
  status: DeployStatus;
  view: DeployView;
  log: DeployLog | null;
  pending: DeployAction | null;
  unsaved: boolean;
  error: string | null;
  onBuild: () => void;
  onCancel: () => void;
  onPublish: () => void;
};

// Payload's theme has no green (`success` is blue), so live takes the Publish button's green.
export const TONES: Record<DeployTone, string> = {
  live: "#16a34a",
  past: "#2f5bd3",
  busy: "var(--theme-warning-600)",
  failed: "var(--theme-error-500)",
  ready: "#2f5bd3",
  muted: "var(--theme-elevation-400)",
};

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const ago = (time: string | number, now: number) => {
  const minutes = Math.round((new Date(time).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 1) {
    return "just now";
  }
  if (Math.abs(minutes) < 60) {
    return relative.format(minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  return Math.abs(hours) < 24
    ? relative.format(hours, "hour")
    : relative.format(Math.round(hours / 24), "day");
};

const duration = (seconds: number) =>
  seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;

const since = (time: string, now: number) =>
  duration(Math.max(0, Math.round((now - new Date(time).getTime()) / 1000)));

// The preview's buttons sit side by side and read as one row: one width, a little wider than any label.
const pairButton = { style: { minWidth: 140, justifyContent: "center" } };

// Payload's buttons read their colours from these variables, which keeps the hover state. Its
// theme has no green (`success` is blue), so the green that means "this goes live" is set here.
export const GREEN_BUTTON = {
  fontWeight: 600,
  "--bg-color": "#16a34a",
  "--hover-bg": "#15803d",
  "--color": "#fff",
  "--hover-color": "#fff",
} as CSSProperties;

export const GREY_BUTTON = {
  "--bg-color": "var(--theme-elevation-150)",
  "--hover-bg": "var(--theme-elevation-150)",
  "--color": "var(--theme-elevation-800)",
  "--hover-color": "var(--theme-elevation-800)",
} as CSSProperties;

const publishButton = { style: { ...pairButton.style, ...GREEN_BUTTON } };

const author = (deploy: DeploySummary | null) =>
  deploy?.startedHere ? `by ${deploy.startedBy ?? "someone"}` : "outside Payload";

const clock = (time: string) =>
  new Date(time).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const muted: CSSProperties = {
  color: "var(--theme-elevation-500)",
  fontSize: 13,
  lineHeight: 1.45,
};
const heading: CSSProperties = { fontSize: 14, fontWeight: 600, margin: 0 };
const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 0",
  borderBottom: "1px solid var(--theme-elevation-100)",
  fontSize: 13,
};

const Dot = ({ color }: { color: string }) => (
  <span
    aria-hidden
    style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}
  />
);

const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: 16,
      borderRadius: "var(--style-radius-m, 8px)",
      border: "1px solid var(--theme-elevation-150)",
      ...style,
    }}
  >
    {children}
  </div>
);

const LOG_COLORS = { info: "#dadad6", warn: "#f5cf7a", error: "#ffb4a8" };

// Everything the drawer shows for one site. It only renders: the status comes from Netlify through
// the plugin's endpoints, and every action goes back through DeployButton.
export const DeployPanel = ({
  status,
  view,
  log,
  pending,
  unsaved,
  error,
  onBuild,
  onCancel,
  onPublish,
}: Props) => {
  const [now, setNow] = useState(() => Date.now());
  const logRef = useRef<HTMLDivElement>(null);
  const { current, site, can } = status;
  const host = new URL(site.url).host;
  const running =
    view === "starting" || view === "queued" || view === "building" || view === "publishing";
  const ownBuild = Boolean(current?.startedHere);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), running ? 1000 : 30_000);
    return () => clearInterval(tick);
  }, [running]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log?.lines.length]);

  const badge: Record<DeployView, { label: string; tone: DeployTone; line: string }> = {
    idle: {
      label: status.lastPublishedAt ? "Live" : "Not published",
      tone: status.lastPublishedAt ? "live" : "muted",
      line: status.lastPublishedAt
        ? `Last published ${ago(status.lastPublishedAt, now)}`
        : "Nothing published yet",
    },
    starting: { label: "Starting", tone: "busy", line: "Asking Netlify for a build…" },
    queued: {
      label: "In the Netlify queue",
      tone: "busy",
      line: `Waiting for a free builder · requested ${current ? since(current.createdAt, now) : ""} ago`,
    },
    building: {
      label: "Building",
      tone: "busy",
      line: `Started ${author(current)} ${current ? since(current.createdAt, now) : ""} ago`,
    },
    ready: {
      label: "Preview ready",
      tone: "ready",
      line: [
        `Built ${current ? ago(current.createdAt, now) : ""} ${author(current)}`,
        current?.tookSeconds ? `took ${duration(current.tookSeconds)}` : null,
        "not live yet",
      ]
        .filter(Boolean)
        .join(" · "),
    },
    failed: {
      label: "Failed",
      tone: "failed",
      line: current ? `Stopped ${ago(current.createdAt, now)}` : "The build stopped",
    },
    publishing: {
      label: "Publishing",
      tone: "busy",
      line: "Replacing the live site with the preview…",
    },
  };
  const state = badge[view];

  // A preview holds what was saved when its build started; anything saved later waits for the next.
  const builtAt = view === "ready" && current ? new Date(current.createdAt).getTime() : null;
  const changeLists =
    view === "idle"
      ? [{ title: "Saved since the last publish", note: null, changes: status.changes }]
      : builtAt !== null
        ? [
            {
              title: "This preview includes",
              note: null,
              changes: status.changes.filter((c) => new Date(c.updatedAt).getTime() <= builtAt),
            },
            {
              title: "Saved after this build started",
              note: "Not in this preview. Build again to include them.",
              changes: status.changes.filter((c) => new Date(c.updatedAt).getTime() > builtAt),
            },
          ]
        : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <strong style={{ fontSize: 16 }}>{host}</strong>
          <span style={muted}>Netlify site {site.name}</span>
        </div>
        {site.adminUrl && (
          <a href={site.adminUrl} rel="noreferrer" style={{ fontSize: 13 }} target="_blank">
            Open in Netlify
          </a>
        )}
      </div>

      {status.note && (
        <div
          style={{
            ...muted,
            padding: "12px 14px",
            borderRadius: "var(--style-radius-m, 8px)",
            background: "var(--theme-elevation-50)",
            color: "var(--theme-elevation-800)",
          }}
        >
          {status.note}
        </div>
      )}

      {error && <span style={{ ...muted, color: "var(--theme-error-500)" }}>{error}</span>}

      {unsaved && (view === "idle" || view === "ready" || view === "failed") && (
        <Card
          style={{
            borderColor: "var(--theme-warning-300)",
            background: "var(--theme-warning-100)",
          }}
        >
          <p style={heading}>This document has unsaved changes</p>
          <span style={{ ...muted, color: "var(--theme-elevation-800)" }}>
            A build takes what is saved in Payload. Save first, or these changes stay out of it.
          </span>
        </Card>
      )}

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 10px",
              borderRadius: 999,
              background: "var(--theme-elevation-100)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Dot color={TONES[state.tone]} />
            {state.label}
          </span>
          <span style={muted}>{state.line}</span>
        </div>

        {view === "ready" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              paddingTop: 16,
              borderTop: "1px solid var(--theme-elevation-150)",
            }}
          >
            <p style={heading}>Check the preview first</p>
            <span style={muted}>
              Open the pages you changed. Nothing is live until you publish.
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {view === "idle" && (
            <Button
              buttonStyle="primary"
              disabled={!can.build}
              margin={false}
              onClick={onBuild}
              size="medium"
            >
              {site.locked ? "Start publishing" : "Build and publish"}
            </Button>
          )}
          {view === "failed" && can.build && (
            <Button buttonStyle="primary" margin={false} onClick={onBuild} size="medium">
              Try again
            </Button>
          )}
          {(view === "starting" || view === "queued" || view === "building") && (
            <>
              <Button buttonStyle="primary" disabled margin={false} size="medium">
                {ownBuild || view === "starting" ? "Building…" : "Start publishing"}
              </Button>
              {ownBuild && can.build && current && (
                <Button
                  buttonStyle="error"
                  disabled={pending === "discard"}
                  margin={false}
                  onClick={onCancel}
                  size="medium"
                >
                  Cancel
                </Button>
              )}
            </>
          )}
          {view === "ready" && (
            <>
              {current?.previewUrl && (
                <Button
                  buttonStyle="primary"
                  el="anchor"
                  extraButtonProps={pairButton}
                  margin={false}
                  newTab
                  size="medium"
                  url={current.previewUrl}
                >
                  Open preview
                </Button>
              )}
              {current?.previewUrl && (
                <span
                  aria-hidden
                  style={{
                    width: 1,
                    alignSelf: "stretch",
                    margin: "0 8px",
                    background: "var(--theme-elevation-150)",
                  }}
                />
              )}
              <Button
                buttonStyle="primary"
                disabled={!can.publish}
                extraButtonProps={publishButton}
                margin={false}
                onClick={onPublish}
                size="medium"
              >
                Publish
              </Button>
              {/* A new build replaces this preview as the one offered; this one stays on Netlify. */}
              {can.build && (
                <Button
                  buttonStyle="secondary"
                  extraButtonProps={pairButton}
                  margin={false}
                  onClick={onBuild}
                  size="medium"
                >
                  Build again
                </Button>
              )}
              <Button
                buttonStyle="error"
                disabled={pending === "discard"}
                margin={false}
                onClick={onCancel}
                size="medium"
              >
                Cancel
              </Button>
            </>
          )}
          {view === "publishing" && (
            <Button buttonStyle="primary" disabled margin={false} size="medium">
              Publishing…
            </Button>
          )}
        </div>

        {view === "idle" && can.build && (
          <span style={muted}>
            {site.locked
              ? "Builds a preview from what is saved in Payload. You check it, then publish."
              : "Builds the site from what is saved in Payload. Netlify publishes it as soon as the build is ready."}
          </span>
        )}
        {view === "idle" && !can.build && (
          <span style={muted}>You can follow builds here, but not start them.</span>
        )}
        {view === "ready" && !can.publish && (
          <span style={muted}>Ask someone who can publish to put this live.</span>
        )}
        {(view === "queued" || view === "building") && !ownBuild && (
          <span style={muted}>
            A build started outside Payload is running. You can start yours when it finishes — this
            panel updates by itself.
          </span>
        )}
      </Card>

      {view === "failed" && current?.errorMessage && (
        <Card
          style={{ borderColor: "var(--theme-error-200)", background: "var(--theme-error-50)" }}
        >
          <p style={{ ...heading, color: "var(--theme-error-750)" }}>Netlify stopped the build</p>
          <span style={{ ...muted, color: "var(--theme-elevation-800)" }}>
            {current.errorMessage}
          </span>
        </Card>
      )}

      {changeLists.map(
        (list) =>
          list.changes.length > 0 && (
            <div key={list.title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={heading}>
                {list.title} · {list.changes.length}
              </p>
              {list.note && <span style={muted}>{list.note}</span>}
              {list.changes.map((change) => (
                <div key={`${change.label}-${change.updatedAt}`} style={row}>
                  {change.url ? (
                    <a href={change.url} style={{ flexGrow: 1, fontWeight: 500 }}>
                      {change.label}
                    </a>
                  ) : (
                    <span style={{ flexGrow: 1, fontWeight: 500 }}>{change.label}</span>
                  )}
                  <span style={muted}>saved {ago(change.updatedAt, now)}</span>
                </div>
              ))}
            </div>
          )
      )}

      {(view === "queued" || view === "building" || view === "failed") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ ...heading, flexGrow: 1 }}>
              Build log{" "}
              {view !== "failed" && <span style={{ ...muted, fontWeight: 500 }}>· live</span>}
            </p>
            {site.adminUrl && current && (
              <a
                href={`${site.adminUrl}/deploys/${current.id}`}
                rel="noreferrer"
                style={{ fontSize: 13 }}
                target="_blank"
              >
                Open in Netlify
              </a>
            )}
          </div>
          <div
            aria-live="polite"
            ref={logRef}
            role="log"
            style={{
              height: 320,
              overflow: "auto",
              padding: "12px 0",
              borderRadius: 6,
              background: "#141414",
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 12,
              lineHeight: 1.75,
            }}
          >
            {!log?.lines.length && (
              <div style={{ padding: "0 14px", color: "#8f8f8b" }}>Waiting for the build log…</div>
            )}
            {log?.lines.map((line, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "0 14px",
                  background: line.level === "error" ? "rgba(255, 120, 100, 0.14)" : "transparent",
                }}
              >
                <span style={{ color: "#8f8f8b", flexShrink: 0 }}>{clock(line.at)}</span>
                <span
                  style={{
                    color: LOG_COLORS[line.level],
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {line.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {status.recent.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={heading}>Recent deploys</p>
          {status.recent.map((deploy) => (
            <div key={deploy.id} style={row}>
              <Dot color={TONES[deploy.tone]} />
              <span style={{ flexGrow: 1, fontWeight: 500 }}>
                {deploy.label}
                <span style={{ ...muted, fontWeight: 400 }}>
                  {deploy.startedHere
                    ? ` · by ${deploy.startedBy ?? "someone"}`
                    : " · not from Payload"}
                </span>
              </span>
              <span style={muted}>{ago(deploy.createdAt, now)}</span>
              <span style={{ ...muted, width: 80, textAlign: "right" }}>
                {deploy.tookSeconds ? duration(deploy.tookSeconds) : ""}
              </span>
              {site.adminUrl && (
                <a
                  href={`${site.adminUrl}/deploys/${deploy.id}`}
                  rel="noreferrer"
                  style={{ fontSize: 13 }}
                  target="_blank"
                >
                  Log
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
