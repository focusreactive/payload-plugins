import { createContext } from "react";

import type { OverlayScope } from "../overlayScope.js";

export const OverlayScopeContext = createContext<OverlayScope | null>(null);
