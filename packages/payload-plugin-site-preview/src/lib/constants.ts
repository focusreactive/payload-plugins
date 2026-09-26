// What the frame posts when an editor clicks a marked block — and what the admin posts back to it
// when a field is focused.
export const PREVIEW_MESSAGE = "payload-preview-edit";
// Where a document's page is rendered: /api/site-preview/pages/12.
export const ENDPOINT = "/site-preview";
// Separates the page from its files: /api/site-preview/pages/12/_/css/app.css.
export const ASSETS_SEGMENT = "_";
// The plugin's own scripts and styles for the frame.
export const FRAME_ENDPOINT = "/site-preview-frame";
export const SITE_TIMEOUT_MS = 30_000;
