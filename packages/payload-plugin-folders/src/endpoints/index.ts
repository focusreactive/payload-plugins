import type { Endpoint } from "payload";

import type { ResolvedOptions } from "../types.js";
import { buildCheckSegmentEndpoint } from "./checkSegment.js";
import { buildFolderPreviewEndpoint } from "./folderPreview.js";
import { buildMoveEndpoint } from "./move.js";
import { buildMovePreviewEndpoint } from "./movePreview.js";
import { buildRevisionEndpoint } from "./revision.js";

/** The REST endpoints the plugin adds under `/api/folders-tree/` (spec section 10.2). */
export const buildFoldersEndpoints = (options: ResolvedOptions): Endpoint[] => [
  buildMoveEndpoint(options),
  buildMovePreviewEndpoint(options),
  buildFolderPreviewEndpoint(options),
  buildRevisionEndpoint(),
  buildCheckSegmentEndpoint(options),
];
