import type { DeployPhase, DeploySummary } from "../types.js";
import { BUILDING_STATES, QUEUED_STATES } from "./constants.js";
import type { NetlifyDeploy, NetlifySite } from "./netlify.js";

export const isRunning = (deploy: NetlifyDeploy) =>
  QUEUED_STATES.includes(deploy.state) || BUILDING_STATES.includes(deploy.state);

const isCancelled = (deploy: NetlifyDeploy) =>
  deploy.state === "error" && /cancel/iu.test(deploy.error_message ?? "");

const isPublished = (deploy: NetlifyDeploy, site: NetlifySite) =>
  deploy.id === site.published_deploy?.id || Boolean(deploy.published_at);

const labelOf = (
  deploy: NetlifyDeploy,
  site: NetlifySite
): Pick<DeploySummary, "label" | "tone"> => {
  if (QUEUED_STATES.includes(deploy.state)) {
    return { label: "In the Netlify queue", tone: "busy" };
  }
  if (BUILDING_STATES.includes(deploy.state)) {
    return { label: "Building", tone: "busy" };
  }
  if (deploy.state === "ready") {
    if (deploy.id === site.published_deploy?.id) {
      return { label: "Published", tone: "live" };
    }
    if (deploy.published_at) {
      return { label: "Was live", tone: "past" };
    }
    // Built before what is live: a later publish replaced it, so it is no longer worth opening.
    return deploy.created_at < (site.published_deploy?.created_at ?? "")
      ? { label: "Outdated preview", tone: "muted" }
      : { label: "Preview, not published", tone: "muted" };
  }
  if (isCancelled(deploy)) {
    return { label: "Cancelled", tone: "failed" };
  }
  // Netlify skips a build it already has one queued for, e.g. when builds are allowed again.
  if (deploy.state === "error" && /^skipped/iu.test(deploy.error_message ?? "")) {
    return { label: "Skipped", tone: "muted" };
  }
  if (deploy.state === "error") {
    return { label: "Failed", tone: "failed" };
  }
  return { label: deploy.state, tone: "muted" };
};

/** Who started a build here, as recorded when it was started; null for a build from elsewhere. */
export type BuildRecord = { by: string } | null;

export const summarize = (
  deploy: NetlifyDeploy,
  site: NetlifySite,
  record: BuildRecord
): DeploySummary => ({
  id: deploy.id,
  ...labelOf(deploy, site),
  title: deploy.title ?? null,
  startedHere: record !== null,
  startedBy: record?.by ?? null,
  createdAt: deploy.created_at,
  tookSeconds: deploy.deploy_time ?? null,
  errorMessage: deploy.error_message ?? null,
  // The deploy's own address. `deploy_ssl_url` is the branch alias (`master--site`), which serves
  // whatever is live, not this build.
  previewUrl: deploy.links?.permalink ?? `https://${deploy.id}--${site.name}.netlify.app`,
});

// The newest production deploy decides: running, waiting to be published (a site whose
// publishing is locked keeps finished builds as previews), failed — or nothing waiting.
export const phaseOf = (latest: NetlifyDeploy | undefined, site: NetlifySite): DeployPhase => {
  if (!latest) {
    return "idle";
  }
  if (QUEUED_STATES.includes(latest.state)) {
    return "queued";
  }
  if (BUILDING_STATES.includes(latest.state)) {
    return "building";
  }
  if (latest.state === "ready") {
    // A preview older than what is live was overtaken by it and is not offered.
    const newer = latest.created_at > (site.published_deploy?.created_at ?? "");
    return !isPublished(latest, site) && site.published_deploy?.locked && newer ? "ready" : "idle";
  }
  if (
    latest.state === "error" &&
    !isCancelled(latest) &&
    !/^skipped/iu.test(latest.error_message ?? "")
  ) {
    return "failed";
  }
  return "idle";
};
