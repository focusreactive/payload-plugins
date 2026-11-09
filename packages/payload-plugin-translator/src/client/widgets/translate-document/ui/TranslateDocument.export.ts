import type { CollectionConfig } from "payload";

import type { AccessGuard } from "../../../../types/AccessGuard.js";
import { AnyAccessGuard } from "../../../../server/shared/index.js";
import type { RawPayloadComponentExport } from "../../../../types/PayloadComponentExport.js";
import type { TargetSelectionMode } from "../../../../types/TargetSelection.js";
import { clientComponentPath } from "../../../shared/utils/componentPath.js";

export class TranslateDocumentExport implements RawPayloadComponentExport {
  serverProps?: object | Record<string, any> | undefined;

  readonly collection: CollectionConfig;
  readonly access: AccessGuard;
  readonly targetSelection: TargetSelectionMode;

  constructor(
    collection: CollectionConfig,
    access: AccessGuard = new AnyAccessGuard(),
    targetSelection: TargetSelectionMode = "single"
  ) {
    this.collection = collection;
    this.access = access;
    this.targetSelection = targetSelection;
    this.serverProps = { collection, access, targetSelection };
  }
  path = clientComponentPath("widgets/translate-document/ui/TranslateDocument.server");
}
