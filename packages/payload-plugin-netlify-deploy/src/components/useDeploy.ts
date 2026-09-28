"use client";

import { toast, useConfig } from "@payloadcms/ui";
import { useCallback, useEffect, useState } from "react";

import { ENDPOINT } from "../lib/constants.js";
import type { DeployLog, DeployStatus } from "../types.js";

export type DeployAction = "build" | "cancel" | "publish";

// Often while something runs, rarely while nothing does — and only while the tab is in view.
const POLL_ACTIVE_MS = 3000;
const POLL_OPEN_MS = 15_000;
const POLL_IDLE_MS = 60_000;
const LOG_PAUSE_MS = 2500;
// A build Netlify accepted can take a moment to show in its deploy list.
const STARTING_MS = 20_000;

type Args = {
  collection: string | null;
  id: number | string | null;
  open: boolean;
  /** Changes whenever the document is saved, so the list of unpublished changes follows at once. */
  refreshKey: string;
};

export const useDeploy = ({ collection, id, open, refreshKey }: Args) => {
  const {
    config: {
      serverURL,
      routes: { api },
    },
  } = useConfig();
  const base = `${serverURL || ""}${api}${ENDPOINT}`;
  const query =
    collection && id !== null
      ? `collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(String(id))}`
      : "";
  const withQuery = (path: string, extra = "") =>
    `${base}${path}?${[query, extra].filter(Boolean).join("&")}`;

  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<DeployLog | null>(null);
  const [pending, setPending] = useState<DeployAction | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(withQuery("/status"), { credentials: "include" }).catch(() => null);
    if (!res) {
      setError("The CMS did not answer.");
      return;
    }
    if (res.status === 404) {
      setMissing(true);
      setStatus(null);
      return;
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.errors?.[0]?.message ?? `Netlify status failed (${res.status}).`);
      return;
    }
    setMissing(false);
    setError(null);
    setStatus(body);
  }, [base, query]);

  const phase = status?.phase;
  const active = phase === "queued" || phase === "building" || pending !== null;

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (missing) {
      return;
    }
    const every = active ? POLL_ACTIVE_MS : open ? POLL_OPEN_MS : POLL_IDLE_MS;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        load();
      }
    }, every);
    return () => clearInterval(timer);
  }, [load, active, open, missing]);

  useEffect(() => {
    if (pending === "build" && (phase === "queued" || phase === "building")) {
      setPending(null);
    }
  }, [pending, phase]);

  const deployId = status?.current?.id ?? null;
  const wantLog =
    open && deployId !== null && (phase === "queued" || phase === "building" || phase === "failed");

  useEffect(() => {
    setLog(null);
  }, [deployId]);

  // One read at a time: a read waits for the log to go quiet, so the next is scheduled after it ends.
  useEffect(() => {
    if (!wantLog || !deployId) {
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      const res = await fetch(withQuery("/log", `deploy=${encodeURIComponent(deployId)}`), {
        credentials: "include",
      }).catch(() => null);
      const body: DeployLog | null = res?.ok ? await res.json().catch(() => null) : null;
      if (!alive) {
        return;
      }
      if (body) {
        setLog(body);
      }
      if (phase !== "failed" && !body?.done) {
        timer = setTimeout(read, LOG_PAUSE_MS);
      }
    };
    read();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [wantLog, deployId, phase, base, query]);

  const act = useCallback(
    async (action: DeployAction, body: Record<string, string> = {}) => {
      setPending(action);
      const res = await fetch(withQuery(`/${action}`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
      const result = res ? await res.json().catch(() => null) : null;
      if (!res?.ok) {
        setPending(null);
        toast.error(result?.errors?.[0]?.message ?? "The request to Netlify failed.");
        await load();
        return;
      }
      await load();
      if (action === "build") {
        setTimeout(
          () => setPending((current) => (current === "build" ? null : current)),
          STARTING_MS
        );
      } else {
        setPending(null);
      }
    },
    [base, query, load]
  );

  return {
    status,
    missing,
    error,
    log,
    pending,
    build: () => act("build"),
    cancel: (deploy: string) => act("cancel", { deployId: deploy }),
    publish: (deploy: string) => act("publish", { deployId: deploy }),
  };
};
