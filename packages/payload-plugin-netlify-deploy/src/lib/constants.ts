export const ENDPOINT = "/netlify-deploy";

export const NETLIFY_API = "https://api.netlify.com/api/v1";

// The socket netlify-cli's `logs:deploy` reads: it replays a deploy's log from the start, then
// streams it while the build runs.
export const LOG_SOCKET = "wss://socketeer.services.netlify.com/build/logs";

export const REQUEST_TIMEOUT_MS = 10_000;

// How long a log read waits: the socket never says "that was everything so far", so a pause this
// long after the last line ends it, and the cap ends a read that keeps streaming.
export const LOG_QUIET_MS = 800;
export const LOG_MAX_MS = 6000;

// Every build started here carries it, which is how the panel tells its own builds from the rest.
export const TITLE_PREFIX = "Payload";

export const BUTTON_COMPONENT = "@focus-reactive/payload-plugin-netlify-deploy/client#DeployButton";

// Netlify's states for a deploy that is not finished yet; the first two are waiting for a builder.
export const QUEUED_STATES = ["new", "pending_review", "accepted", "enqueued"];
export const BUILDING_STATES = [
  "building",
  "uploading",
  "uploaded",
  "preparing",
  "prepared",
  "processing",
  "processed",
  "retrying",
];
