import type { CollectionConfig } from "payload";

import type { AccessGuard } from "../../../../types/AccessGuard";
import { AnyAccessGuard } from "../../../../server/shared";
import type { RawPayloadComponentExport } from "../../../../types/PayloadComponentExport";
import type { TargetSelectionMode } from "../../../../types/TargetSelection";
import { clientComponentPath } from "../../../shared/utils/componentPath";

export class TranslateDocumentExport implements RawPayloadComponentExport {
  serverProps?: object | Record<string, any> | undefined;

  constructor(
    readonly collection: CollectionConfig,
    readonly access: AccessGuard = new AnyAccessGuard(),
    readonly targetSelection: TargetSelectionMode = "single"
  ) {
    this.serverProps = { collection, access, targetSelection };
  }
  path = clientComponentPath("widgets/translate-document/ui/TranslateDocument.server");
}
