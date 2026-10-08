import { VisualEditingOverlay } from "./VisualEditingOverlay.js";
import { VisualEditingProvider } from "./VisualEditingProvider.js";
import { VisualEditingToggle } from "./VisualEditingToggle.js";

export {
  type BuildAdminEditUrl,
  type BuildAdminEditUrlArgs,
  defaultBuildAdminEditUrl,
} from "./buildAdminEditUrl.js";
export { useVisualEditing } from "./VisualEditingProvider.js";
export { withVisualEditingPath } from "./withVisualEditingPath.js";

export const VisualEditing = {
  Provider: VisualEditingProvider,
  Overlay: VisualEditingOverlay,
  Toggle: VisualEditingToggle,
};
