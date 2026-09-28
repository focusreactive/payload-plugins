import {
  LOG_MAX_MS,
  LOG_QUIET_MS,
  LOG_SOCKET,
  NETLIFY_API,
  REQUEST_TIMEOUT_MS,
} from "./constants.js";

export type NetlifySite = {
  id: string;
  name: string;
  url?: string;
  ssl_url?: string;
  admin_url?: string;
  build_settings?: { stop_builds?: boolean };
  published_deploy?: {
    id: string;
    created_at?: string;
    published_at?: string | null;
    locked?: boolean | null;
  } | null;
};

export type NetlifyDeploy = {
  id: string;
  site_id: string;
  state: string;
  context?: string;
  title?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
  published_at?: string | null;
  deploy_time?: number | null;
  deploy_ssl_url?: string;
  links?: { permalink?: string };
};

export type LogLine = { at: string; text: string; level: "info" | "warn" | "error" };

export class NetlifyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Build output is coloured for a terminal; the panel shows plain text. Built from the escape
// character's code, since a control character in a regex literal reads as a typo.
const ANSI = new RegExp(`${String.fromCodePoint(27)}\\[[0-9;]*m`, "gu");

const levelOf = (message: { level?: string }, text: string): LogLine["level"] => {
  const level = message.level?.toLowerCase();
  if (level === "error" || /(^|\s)(error|err!)\b|failed\b|non-zero exit/iu.test(text)) {
    return "error";
  }
  if (level === "warn" || level === "warning" || /\bwarn(ing)?\b/iu.test(text)) {
    return "warn";
  }
  return "info";
};

type SocketMessage = {
  ts?: string | number;
  log?: string;
  message?: string;
  level?: string;
  section?: string;
  type?: string;
  status?: number;
};

// One read of a deploy's log: everything so far, and whether the build has ended. Short-lived by
// design — the panel asks again while the build runs, so no connection outlives a request.
const readLog = (token: string, siteId: string, deployId: string) =>
  new Promise<{ lines: LogLine[]; done: boolean }>((resolve, reject) => {
    const lines: LogLine[] = [];
    let done = false;
    let settled = false;
    const timers: { quiet?: ReturnType<typeof setTimeout>; cap?: ReturnType<typeof setTimeout> } =
      {};
    const socket = new WebSocket(LOG_SOCKET);

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timers.quiet);
      clearTimeout(timers.cap);
      socket.close();
      if (error && lines.length === 0) {
        reject(error);
        return;
      }
      resolve({ lines, done });
    };
    timers.cap = setTimeout(() => finish(), LOG_MAX_MS);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ deploy_id: deployId, site_id: siteId, access_token: token }));
    });
    socket.addEventListener("message", (event) => {
      let message: SocketMessage;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.type === "error") {
        finish(new NetlifyError("Netlify refused the build log", message.status ?? 502));
        return;
      }
      const text = String(message.log ?? message.message ?? "")
        .replace(ANSI, "")
        .trimEnd();
      if (text) {
        const at = message.ts ? new Date(message.ts).toISOString() : new Date().toISOString();
        lines.push({ at, text, level: levelOf(message, text) });
      }
      if (message.type === "report" && message.section === "building") {
        done = true;
        finish();
        return;
      }
      clearTimeout(timers.quiet);
      timers.quiet = setTimeout(() => finish(), LOG_QUIET_MS);
    });
    socket.addEventListener("error", () =>
      finish(new NetlifyError("The build log is not available", 502))
    );
    socket.addEventListener("close", () => finish());
  });

export const netlifyClient = (token: string) => {
  const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const res = await fetch(`${NETLIFY_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new NetlifyError(
        `Netlify answered ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
        res.status
      );
    }
    return (res.status === 204 ? null : await res.json()) as T;
  };

  return {
    /** A site by its id or any of its domains — Netlify takes either wherever it takes an id. */
    site: (site: string) => call<NetlifySite>(`/sites/${encodeURIComponent(site)}`),
    deploys: (siteId: string, perPage = 10) =>
      call<NetlifyDeploy[]>(`/sites/${siteId}/deploys?production=true&per_page=${perPage}`),
    deploy: (deployId: string) => call<NetlifyDeploy>(`/deploys/${deployId}`),
    stopBuilds: (siteId: string, stop: boolean) =>
      call<NetlifySite>(`/sites/${siteId}`, {
        method: "PATCH",
        body: JSON.stringify({ build_settings: { stop_builds: stop } }),
      }),
    build: (siteId: string, title: string) =>
      call<{ id: string; deploy_id: string }>(
        `/sites/${siteId}/builds?title=${encodeURIComponent(title)}`,
        {
          method: "POST",
        }
      ),
    cancel: (deployId: string) =>
      call<NetlifyDeploy>(`/deploys/${deployId}/cancel`, { method: "POST" }),
    publish: (siteId: string, deployId: string) =>
      call<NetlifyDeploy>(`/sites/${siteId}/deploys/${deployId}/restore`, { method: "POST" }),
    log: (siteId: string, deployId: string) => readLog(token, siteId, deployId),
  };
};

export type NetlifyClient = ReturnType<typeof netlifyClient>;
