import { VisualEditingOverlay } from "./VisualEditingOverlay.js";
import { VisualEditingProvider } from "./VisualEditingProvider.js";
import { VisualEditingToggle } from "./VisualEditingToggle.js";

export {
  type BuildAdminEditUrl,
  type BuildAdminEditUrlArgs,
  defaultBuildAdminEditUrl,
} from "../shared/buildAdminEditUrl.js";
export { LiveRichText, type LiveRichTextProps } from "./instantPreview/LiveRichText.js";
export type {
  LiveRichTextAction,
  LiveRichTextRender,
} from "./instantPreview/unsavedRender/useUnsavedRender.js";
export { type LiveRichTextIdentity, liveRichTextOf } from "./instantPreview/liveRichTextOf.js";
export type { LiveRichTextField, LiveRichTextRequest } from "../shared/protocol.js";
export { useVisualEditing } from "./VisualEditingProvider.js";
export { withVisualEditingPath } from "./withVisualEditingPath.js";

export const VisualEditing = {
  Provider: VisualEditingProvider,
  Overlay: VisualEditingOverlay,
  Toggle: VisualEditingToggle,
};
