import { VisualEditingOverlay } from "./react/VisualEditingOverlay.js";
import { VisualEditingProvider } from "./react/VisualEditingProvider.js";
import { VisualEditingToggle } from "./react/VisualEditingToggle.js";

export {
  type BuildAdminEditUrl,
  type BuildAdminEditUrlArgs,
  defaultBuildAdminEditUrl,
} from "../shared/buildAdminEditUrl.js";
export { LiveRichText, type LiveRichTextProps } from "./react/LiveRichText.js";
export type {
  LiveRichTextAction,
  LiveRichTextRender,
  LiveRichTextRenderValue,
} from "./react/useUnsavedRender.js";
export { type LiveRichTextIdentity, liveRichTextOf } from "./instantPreview/liveRichTextOf.js";
export type { LiveRichTextField, LiveRichTextRequest } from "../shared/protocol.js";
export { useVisualEditing } from "./react/VisualEditingProvider.js";
export { withVisualEditingPath } from "./withVisualEditingPath.js";

export const VisualEditing = {
  Provider: VisualEditingProvider,
  Overlay: VisualEditingOverlay,
  Toggle: VisualEditingToggle,
};
