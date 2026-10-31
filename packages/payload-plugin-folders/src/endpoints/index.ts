import type { Endpoint } from "payload";

import type { ResolvedOptions } from "../types.js";
import { buildAncestorsEndpoint } from "./ancestors.js";
import { buildCheckRootPageEndpoint } from "./checkRootPage.js";
import { buildCheckSegmentEndpoint } from "./checkSegment.js";
import { buildChildrenEndpoint } from "./children.js";
import { buildFolderPreviewEndpoint } from "./folderPreview.js";
import { buildMoveEndpoint } from "./move.js";
import { buildMovePreviewEndpoint } from "./movePreview.js";
import { buildOperationStepEndpoint } from "./operationStep.js";
import { buildPathsEndpoint } from "./paths.js";
import { buildPreviewUrlEndpoint } from "./previewUrl.js";
import { buildPublishEndpoint } from "./publish.js";
import { buildResolveEndpoint } from "./resolve.js";
import { buildRevisionEndpoint } from "./revision.js";
import { buildSearchEndpoint } from "./search.js";
import { buildTreeEndpoint } from "./tree.js";

/** The REST endpoints the plugin adds under `/api/folders-tree/` (spec section 10.2). */
export const buildFoldersEndpoints = (options: ResolvedOptions): Endpoint[] => [
  buildMoveEndpoint(options),
  buildMovePreviewEndpoint(options),
  buildFolderPreviewEndpoint(options),
  buildRevisionEndpoint(),
  buildCheckSegmentEndpoint(options),
  buildCheckRootPageEndpoint(options),
  buildChildrenEndpoint(options),
  buildSearchEndpoint(options),
  buildAncestorsEndpoint(options),
  buildPreviewUrlEndpoint(options),
  buildResolveEndpoint(),
  buildTreeEndpoint(options),
  buildPathsEndpoint(),
  buildOperationStepEndpoint(options),
  buildPublishEndpoint(options),
];
