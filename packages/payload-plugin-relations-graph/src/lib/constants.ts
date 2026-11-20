export const PACKAGE_NAME = "@focus-reactive/payload-plugin-relations-graph";
/** Key under `config.custom` where the resolved options are kept for server components. */
export const CUSTOM_KEY = "relationsGraph";
/** Base path of the plugin's REST endpoints, under the Payload API route. */
export const ENDPOINT_BASE = "/relations-graph";
export const DEFAULT_VIEW_PATH = "/relations-graph";

export const VIEW_COMPONENT = `${PACKAGE_NAME}/rsc#RelationsGraphView`;
export const NAV_LINK_COMPONENT = `${PACKAGE_NAME}/client#RelationsGraphNavLink`;
