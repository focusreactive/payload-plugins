import { createContext } from "react";

import type { SavedRichTextShapes } from "./instantPreview/unsavedRender/savedShapes.js";

export const OverlayLocaleContext = createContext<string | undefined>(undefined);

export const SavedRichTextShapesContext = createContext<SavedRichTextShapes | null>(null);
