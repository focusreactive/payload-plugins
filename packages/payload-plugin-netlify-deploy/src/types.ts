import type { Access, CollectionSlug, PayloadRequest } from "payload";

import type { LogLine } from "./lib/netlify.js";

export type { LogLine } from "./lib/netlify.js";

/** The document the button sits on; both null for the button in the admin's top bar. */
export type SiteArgs = {
  req: PayloadRequest;
  collection: CollectionSlug | null;
  id: string | null;
};

export type SiteTarget = {
  /** The Netlify site: its id, or any of its domains (`example.com`, `example.netlify.app`). */
  site: string;
  /** A line shown above the controls, e.g. that this site serves several editions. */
  note?: string;
};

/** A saved document the next build would carry to the site. */
export type DeployChange = { label: string; updatedAt: string; url?: string };

export type DeployEventArgs = {
  req: PayloadRequest;
  site: { id: string; name: string; url: string };
  deployId: string;
};

export type NetlifyDeployOptions = {
  /** A Netlify personal access token; server-side only, never sent to the browser. */
  token: string | undefined;
  /**
   * The Netlify site to build: one site for the whole CMS (its id or domain), or a function that
   * finds each document's site, for a CMS that feeds many. Return null where a document has none.
   */
  site: string | ((args: SiteArgs) => Promise<SiteTarget | null> | SiteTarget | null);
  /** Collections whose edit view gets the button, beside Save. */
  collections?: CollectionSlug[];
  /** Also put the button in the admin's top bar. Meant for a single site: there is no document there. */
  header?: boolean;
  /**
   * Who may start a build, and who may publish one: Payload access functions, the ones collections
   * use. Only `true` allows — a query result means nothing here. Default: anyone signed in.
   */
  access?: { build?: Access; publish?: Access };
  /**
   * What the next build would carry: documents saved since `since` — when the live build started,
   * so a save made while it ran still counts. Null before anything is published.
   */
  changes?: (args: SiteArgs & { since: Date | null }) => Promise<DeployChange[]> | DeployChange[];
  /** Called after a build starts — to tell a Slack channel, for instance. */
  onBuild?: (args: DeployEventArgs) => void | Promise<void>;
  /** Called after a preview is published. */
  onPublish?: (args: DeployEventArgs) => void | Promise<void>;
};

export type DeployPhase = "idle" | "queued" | "building" | "ready" | "failed";

export type DeployTone = "live" | "past" | "busy" | "ready" | "failed" | "muted";

export type DeploySummary = {
  id: string;
  label: string;
  tone: DeployTone;
  title: string | null;
  startedHere: boolean;
  /** Who started it in Payload, read back from the build's title; null for a build started elsewhere. */
  startedBy: string | null;
  createdAt: string;
  tookSeconds: number | null;
  errorMessage: string | null;
  previewUrl: string | null;
};

export type DeployStatus = {
  site: { name: string; url: string; adminUrl: string | null; locked: boolean };
  note: string | null;
  lastPublishedAt: string | null;
  phase: DeployPhase;
  /** The deploy the phase is about; null when nothing is waiting. */
  current: DeploySummary | null;
  recent: DeploySummary[];
  changes: DeployChange[];
  can: { build: boolean; publish: boolean };
};

export type DeployLog = {
  lines: LogLine[];
  done: boolean;
};
