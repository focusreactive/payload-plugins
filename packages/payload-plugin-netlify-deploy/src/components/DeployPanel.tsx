"use client";

import { Button } from "@payloadcms/ui";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import type { DeployLog, DeployStatus, DeployTone } from "../types.js";
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
  onDiscard: () => void;
};

export const TONES: Record<DeployTone, string> = {
  live: "var(--theme-success-500)",
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
  onDiscard,
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
      line: `Started ${ownBuild ? "from Payload" : "outside Payload"} ${current ? since(current.createdAt, now) : ""} ago`,
    },
    ready: {
      label: "Preview ready",
      tone: "ready",
      line: `Built${current?.tookSeconds ? ` in ${duration(current.tookSeconds)}` : ""} · not live yet`,
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

      {unsaved && (view === "idle" || view === "failed") && (
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

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {view === "idle" && (
            <Button
              buttonStyle="primary"
              disabled={!can.build}
              margin={false}
              onClick={onBuild}
              size="medium"
            >
              {site.locked ? "Build preview" : "Build and publish"}
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
                {ownBuild || view === "starting" ? "Building…" : "Build preview"}
              </Button>
              {ownBuild && can.build && current && (
                <Button
                  buttonStyle="secondary"
                  disabled={pending === "cancel"}
                  margin={false}
                  onClick={onCancel}
                  size="medium"
                >
                  Cancel build
                </Button>
              )}
            </>
          )}
          {view === "ready" && (
            <>
              <Button
                buttonStyle="primary"
                disabled={!can.publish}
                margin={false}
                onClick={onPublish}
                size="medium"
              >
                Publish to {host}
              </Button>
              <Button buttonStyle="secondary" margin={false} onClick={onDiscard} size="medium">
                Discard
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
              ? "Builds the site from what is saved in Payload. You check the preview before anything goes live."
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

      {view === "ready" && current?.previewUrl && (
        <Card
          style={{ borderColor: "rgba(47, 91, 211, 0.35)", background: "rgba(47, 91, 211, 0.07)" }}
        >
          <p style={heading}>Check the preview first</p>
          <span style={muted}>Open the pages you changed. Nothing is live until you publish.</span>
          <div>
            <Button
              buttonStyle="secondary"
              el="anchor"
              margin={false}
              newTab
              size="medium"
              url={current.previewUrl}
            >
              Open preview
            </Button>
          </div>
        </Card>
      )}

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

      {(view === "idle" || view === "ready") && status.changes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={heading}>
            {view === "ready" ? "This preview includes" : "Saved since the last publish"} ·{" "}
            {status.changes.length}
          </p>
          {status.changes.map((change) => (
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

      {view === "idle" && status.recent.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={heading}>Recent deploys</p>
          {status.recent.map((deploy) => (
            <div key={deploy.id} style={row}>
              <Dot color={TONES[deploy.tone]} />
              <span style={{ flexGrow: 1, fontWeight: 500 }}>
                {deploy.label}
                {deploy.startedHere && (
                  <span style={{ ...muted, fontWeight: 400 }}> · from Payload</span>
                )}
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
