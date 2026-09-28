import type { DeployPhase, DeploySummary } from "../types.js";
import { BUILDING_STATES, QUEUED_STATES, TITLE_PREFIX } from "./constants.js";
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
    return isPublished(deploy, site)
      ? { label: "Published", tone: "live" }
      : { label: "Preview, not published", tone: "ready" };
  }
  if (isCancelled(deploy)) {
    return { label: "Cancelled", tone: "muted" };
  }
  if (deploy.state === "error") {
    return { label: "Failed", tone: "failed" };
  }
  return { label: deploy.state, tone: "muted" };
};

export const summarize = (deploy: NetlifyDeploy, site: NetlifySite): DeploySummary => ({
  id: deploy.id,
  ...labelOf(deploy, site),
  title: deploy.title ?? null,
  startedHere: Boolean(deploy.title?.startsWith(TITLE_PREFIX)),
  createdAt: deploy.created_at,
  tookSeconds: deploy.deploy_time ?? null,
  errorMessage: deploy.error_message ?? null,
  previewUrl: deploy.links?.permalink ?? deploy.deploy_ssl_url ?? null,
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
    return !isPublished(latest, site) && site.published_deploy?.locked ? "ready" : "idle";
  }
  if (latest.state === "error" && !isCancelled(latest)) {
    return "failed";
  }
  return "idle";
};
